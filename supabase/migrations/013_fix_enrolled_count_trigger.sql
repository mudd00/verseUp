-- =====================================================
-- enrolled_count 트리거 수정 및 데이터 동기화
-- =====================================================
-- 문제: 수강 신청 시 enrolled_count가 자동으로 증가하지 않음
-- 해결: 트리거 재생성 및 기존 데이터 동기화

-- =====================================================
-- 1. 기존 트리거 제거
-- =====================================================

DROP TRIGGER IF EXISTS increment_course_enrolled_count ON public.enrollments;
DROP TRIGGER IF EXISTS decrement_course_enrolled_count ON public.enrollments;
DROP TRIGGER IF EXISTS update_course_enrolled_count_on_status ON public.enrollments;

-- =====================================================
-- 2. 함수 재생성
-- =====================================================

-- 수강 신청 시 enrolled_count 증가
CREATE OR REPLACE FUNCTION increment_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  -- active 상태로 수강 신청 시에만 증가
  IF NEW.status = 'active' THEN
    UPDATE public.courses
    SET enrolled_count = enrolled_count + 1
    WHERE id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 수강 취소/삭제 시 enrolled_count 감소
CREATE OR REPLACE FUNCTION update_enrolled_count_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- UPDATE: active → dropped (수강 취소)
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'dropped' THEN
    UPDATE public.courses
    SET enrolled_count = GREATEST(0, enrolled_count - 1)
    WHERE id = OLD.course_id;
    RETURN NEW;
  END IF;

  -- UPDATE: dropped → active (재수강)
  IF TG_OP = 'UPDATE' AND OLD.status = 'dropped' AND NEW.status = 'active' THEN
    UPDATE public.courses
    SET enrolled_count = enrolled_count + 1
    WHERE id = NEW.course_id;
    RETURN NEW;
  END IF;

  -- DELETE: active 상태였던 수강 신청 삭제
  IF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.courses
    SET enrolled_count = GREATEST(0, enrolled_count - 1)
    WHERE id = OLD.course_id;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. 트리거 생성
-- =====================================================

-- INSERT 시 enrolled_count 증가
CREATE TRIGGER increment_course_enrolled_count
  AFTER INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION increment_enrolled_count();

-- UPDATE/DELETE 시 enrolled_count 업데이트
CREATE TRIGGER update_course_enrolled_count_on_status
  AFTER UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_enrolled_count_on_status_change();

-- =====================================================
-- 4. 기존 데이터 동기화
-- =====================================================
-- 모든 강의의 enrolled_count를 실제 active 수강생 수와 동기화

UPDATE public.courses c
SET enrolled_count = (
  SELECT COUNT(*)
  FROM public.enrollments e
  WHERE e.course_id = c.id
    AND e.status = 'active'
);

-- =====================================================
-- 5. 검증 쿼리
-- =====================================================
-- 실행 후 결과 확인용 (주석 제거 후 실행)

/*
SELECT
  c.id,
  c.title,
  c.enrolled_count as db_count,
  COUNT(e.id) FILTER (WHERE e.status = 'active') as actual_count,
  c.max_students,
  CASE
    WHEN c.enrolled_count = COUNT(e.id) FILTER (WHERE e.status = 'active')
    THEN '✅ 일치'
    ELSE '❌ 불일치'
  END as status
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.enrolled_count, c.max_students
ORDER BY c.created_at DESC;
*/

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ enrolled_count 트리거가 재생성되었습니다.';
  RAISE NOTICE '✅ 기존 데이터가 동기화되었습니다.';
  RAISE NOTICE '이제 수강 신청/취소 시 enrolled_count가 자동으로 업데이트됩니다.';
END $$;
