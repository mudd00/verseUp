-- =====================================================
-- enrolled_count 동기화 및 중복 데이터 확인
-- =====================================================
-- 목적: enrolled_count를 실제 active 수강생 수와 동기화
-- 배경: 트리거 적용 전 발생한 데이터 불일치 수정

-- =====================================================
-- 1. 중복 enrollment 확인 및 제거
-- =====================================================
-- 같은 학생이 같은 강의에 여러 번 등록된 경우 체크
-- UNIQUE(course_id, student_id) 제약조건이 있지만 혹시 모를 중복 확인

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT course_id, student_id, COUNT(*) as cnt
    FROM public.enrollments
    GROUP BY course_id, student_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE '⚠️ 중복 enrollment 발견: % 건', duplicate_count;
  ELSE
    RAISE NOTICE '✅ 중복 enrollment 없음';
  END IF;
END $$;

-- =====================================================
-- 2. enrolled_count 동기화
-- =====================================================
-- 모든 강의의 enrolled_count를 실제 active 수강생 수와 동기화

UPDATE public.courses c
SET enrolled_count = (
  SELECT COUNT(*)
  FROM public.enrollments e
  WHERE e.course_id = c.id
    AND e.status = 'active'
)
WHERE enrolled_count != (
  SELECT COUNT(*)
  FROM public.enrollments e
  WHERE e.course_id = c.id
    AND e.status = 'active'
);

-- =====================================================
-- 3. 동기화 결과 확인
-- =====================================================

DO $$
DECLARE
  updated_count INTEGER;
  total_courses INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO total_courses
  FROM public.courses;

  SELECT COUNT(*)
  INTO updated_count
  FROM public.courses c
  WHERE c.enrolled_count = (
    SELECT COUNT(*)
    FROM public.enrollments e
    WHERE e.course_id = c.id
      AND e.status = 'active'
  );

  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ enrolled_count 동기화 완료';
  RAISE NOTICE '전체 강의: %', total_courses;
  RAISE NOTICE '동기화된 강의: %', updated_count;

  IF updated_count = total_courses THEN
    RAISE NOTICE '✅ 모든 강의의 enrolled_count가 정확합니다';
  ELSE
    RAISE NOTICE '⚠️ 일부 강의의 enrolled_count가 불일치 상태입니다';
  END IF;
  RAISE NOTICE '====================================';
END $$;
