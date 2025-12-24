-- =====================================================
-- enrolled_count 즉시 수정 스크립트
-- =====================================================
-- 목적: 불일치하는 enrolled_count를 실제 값으로 즉시 동기화

-- =====================================================
-- 1. 현재 상태 확인
-- =====================================================
SELECT
  c.id,
  c.title,
  c.enrolled_count as 현재_DB값,
  COUNT(e.id) FILTER (WHERE e.status = 'active') as 실제_active_수,
  c.enrolled_count - COUNT(e.id) FILTER (WHERE e.status = 'active') as 차이
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.enrolled_count
ORDER BY c.title;

-- =====================================================
-- 2. enrolled_count 동기화 실행
-- =====================================================
UPDATE courses c
SET enrolled_count = (
  SELECT COUNT(*)
  FROM enrollments e
  WHERE e.course_id = c.id
    AND e.status = 'active'
)
WHERE c.enrolled_count != (
  SELECT COUNT(*)
  FROM enrollments e
  WHERE e.course_id = c.id
    AND e.status = 'active'
);

-- =====================================================
-- 3. 수정 후 결과 확인
-- =====================================================
SELECT
  c.id,
  c.title,
  c.enrolled_count as 수정된_DB값,
  COUNT(e.id) FILTER (WHERE e.status = 'active') as 실제_active_수,
  c.enrolled_count - COUNT(e.id) FILTER (WHERE e.status = 'active') as 차이,
  CASE
    WHEN c.enrolled_count = COUNT(e.id) FILTER (WHERE e.status = 'active')
    THEN '✅ 일치'
    ELSE '❌ 불일치'
  END as 상태
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.enrolled_count
ORDER BY c.title;

-- =====================================================
-- 4. 트리거 작동 확인
-- =====================================================
SELECT
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'enrollments'
ORDER BY trigger_name;
