-- =====================================================
-- 트리거 상태 확인 쿼리
-- =====================================================
-- Supabase SQL Editor에서 실행하여 트리거가 제대로 설치되었는지 확인

-- 1. 모든 트리거 목록 확인
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('enrollments', 'courses', 'profiles')
ORDER BY event_object_table, trigger_name;

-- 2. enrolled_count 관련 함수 확인
SELECT
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%enrolled_count%';

-- 3. 현재 강의별 enrolled_count 확인
SELECT
  c.id,
  c.title,
  c.enrolled_count as current_count,
  COUNT(e.id) as actual_count
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
GROUP BY c.id, c.title, c.enrolled_count
ORDER BY c.created_at DESC;

-- 4. 수강 신청 현황
SELECT
  e.id,
  e.course_id,
  c.title,
  e.student_id,
  p.name as student_name,
  e.status,
  e.enrolled_at
FROM enrollments e
JOIN courses c ON e.course_id = c.id
JOIN profiles p ON e.student_id = p.id
ORDER BY e.enrolled_at DESC
LIMIT 20;
