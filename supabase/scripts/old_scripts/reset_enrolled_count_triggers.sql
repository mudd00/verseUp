-- =====================================================
-- enrolled_count 트리거 완전 초기화 및 재설치
-- =====================================================
-- 목적: 중복 트리거 제거 후 깔끔하게 재설치

-- =====================================================
-- 1. 모든 관련 트리거 완전 삭제
-- =====================================================
DROP TRIGGER IF EXISTS manage_enrolled_count_trigger ON public.enrollments;
DROP TRIGGER IF EXISTS sync_enrolled_count_on_enrollment_change ON public.enrollments;
DROP TRIGGER IF EXISTS update_course_enrolled_count_on_status ON public.enrollments;
DROP TRIGGER IF EXISTS increment_course_enrolled_count ON public.enrollments;
DROP TRIGGER IF EXISTS decrement_course_enrolled_count ON public.enrollments;
DROP TRIGGER IF EXISTS update_enrolled_count_trigger ON public.enrollments;

-- =====================================================
-- 2. 모든 관련 함수 완전 삭제
-- =====================================================
DROP FUNCTION IF EXISTS manage_enrolled_count() CASCADE;
DROP FUNCTION IF EXISTS sync_enrolled_count() CASCADE;
DROP FUNCTION IF EXISTS update_enrolled_count_on_status() CASCADE;
DROP FUNCTION IF EXISTS increment_enrolled_count() CASCADE;
DROP FUNCTION IF EXISTS decrement_enrolled_count() CASCADE;
DROP FUNCTION IF EXISTS update_enrolled_count_on_status_change() CASCADE;

-- =====================================================
-- 3. 새로운 통합 함수 생성
-- =====================================================
CREATE OR REPLACE FUNCTION manage_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT: active 상태로 등록
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE public.courses
      SET enrolled_count = enrolled_count + 1
      WHERE id = NEW.course_id;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: 상태 변경
  IF TG_OP = 'UPDATE' THEN
    -- active → dropped (수강 취소)
    IF OLD.status = 'active' AND NEW.status = 'dropped' THEN
      UPDATE public.courses
      SET enrolled_count = GREATEST(0, enrolled_count - 1)
      WHERE id = OLD.course_id;

    -- dropped → active (재수강)
    ELSIF OLD.status = 'dropped' AND NEW.status = 'active' THEN
      UPDATE public.courses
      SET enrolled_count = enrolled_count + 1
      WHERE id = NEW.course_id;

    -- completed → active (재수강)
    ELSIF OLD.status = 'completed' AND NEW.status = 'active' THEN
      UPDATE public.courses
      SET enrolled_count = enrolled_count + 1
      WHERE id = NEW.course_id;

    -- active → completed (수료)
    ELSIF OLD.status = 'active' AND NEW.status = 'completed' THEN
      UPDATE public.courses
      SET enrolled_count = GREATEST(0, enrolled_count - 1)
      WHERE id = OLD.course_id;
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE: active 상태 삭제
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE public.courses
      SET enrolled_count = GREATEST(0, enrolled_count - 1)
      WHERE id = OLD.course_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. 단일 트리거 생성
-- =====================================================
CREATE TRIGGER manage_enrolled_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION manage_enrolled_count();

-- =====================================================
-- 5. enrolled_count 완전 동기화
-- =====================================================
UPDATE courses c
SET enrolled_count = (
  SELECT COUNT(*)
  FROM enrollments e
  WHERE e.course_id = c.id
    AND e.status = 'active'
);

-- =====================================================
-- 6. 검증
-- =====================================================
-- 트리거 목록 확인
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  '✅' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'enrollments'
ORDER BY trigger_name;

-- enrolled_count 정확성 확인
SELECT
  c.id,
  c.title,
  c.enrolled_count as DB값,
  COUNT(e.id) FILTER (WHERE e.status = 'active') as 실제값,
  CASE
    WHEN c.enrolled_count = COUNT(e.id) FILTER (WHERE e.status = 'active')
    THEN '✅ 정상'
    ELSE '❌ 불일치'
  END as 상태
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.enrolled_count
ORDER BY c.title;
