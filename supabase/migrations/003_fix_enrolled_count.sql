-- enrolled_count를 실제 수강 중인 학생 수로 동기화하는 마이그레이션

-- =====================================================
-- 1. 기존 트리거 삭제 (재생성을 위해)
-- =====================================================
DROP TRIGGER IF EXISTS increment_course_enrolled_count ON public.enrollments;
DROP TRIGGER IF EXISTS decrement_course_enrolled_count ON public.enrollments;

-- =====================================================
-- 2. enrolled_count 재계산 함수
-- =====================================================
-- 특정 강의의 enrolled_count를 실제 active 상태인 enrollments 수로 재계산
CREATE OR REPLACE FUNCTION sync_course_enrolled_count(course_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.courses
  SET enrolled_count = (
    SELECT COUNT(*)
    FROM public.enrollments
    WHERE course_id = course_uuid
    AND status = 'active'
  )
  WHERE id = course_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. enrollments 변경 시 enrolled_count 동기화 함수
-- =====================================================
CREATE OR REPLACE FUNCTION update_enrolled_count_on_change()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT나 UPDATE의 경우
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- 새로운 course_id의 enrolled_count 재계산
    PERFORM sync_course_enrolled_count(NEW.course_id);

    -- UPDATE이고 course_id가 변경된 경우 이전 course_id도 재계산
    IF (TG_OP = 'UPDATE' AND OLD.course_id != NEW.course_id) THEN
      PERFORM sync_course_enrolled_count(OLD.course_id);
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE의 경우
  IF (TG_OP = 'DELETE') THEN
    PERFORM sync_course_enrolled_count(OLD.course_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. 새로운 트리거 생성 (INSERT, UPDATE, DELETE 모두 처리)
-- =====================================================
CREATE TRIGGER sync_enrolled_count_on_enrollment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_enrolled_count_on_change();

-- =====================================================
-- 5. 모든 강의의 enrolled_count를 현재 상태로 동기화
-- =====================================================
-- 기존 데이터가 있는 경우 enrolled_count를 실제 값으로 수정
DO $$
DECLARE
  course_record RECORD;
BEGIN
  FOR course_record IN SELECT id FROM public.courses
  LOOP
    PERFORM sync_course_enrolled_count(course_record.id);
  END LOOP;
END $$;

-- =====================================================
-- 6. 기존 함수 제거 (더 이상 사용하지 않음)
-- =====================================================
DROP FUNCTION IF EXISTS increment_enrolled_count();
DROP FUNCTION IF EXISTS decrement_enrolled_count();

COMMENT ON FUNCTION sync_course_enrolled_count(UUID) IS '특정 강의의 enrolled_count를 실제 active 상태 enrollments 수로 재계산';
COMMENT ON FUNCTION update_enrolled_count_on_change() IS 'enrollments 테이블 변경 시 자동으로 enrolled_count 동기화';
