-- =====================================================
-- Enrollment 실시간 디버깅 쿼리
-- =====================================================
-- 수강 취소 → 재수강 과정에서 데이터 변화를 추적합니다

-- =====================================================
-- 1. 특정 학생의 enrollment 상태 확인
-- =====================================================
-- student_id를 실제 ID로 변경하세요
SELECT
  e.id,
  e.course_id,
  c.title as course_title,
  e.student_id,
  e.status,
  e.enrolled_at,
  e.created_at,
  e.updated_at,
  c.enrolled_count as course_enrolled_count
FROM enrollments e
JOIN courses c ON e.course_id = c.id
-- WHERE e.student_id = 'YOUR_STUDENT_ID_HERE'  -- 주석 해제하고 ID 입력
ORDER BY e.enrolled_at DESC;

-- =====================================================
-- 2. 특정 강의의 enrollment 목록
-- =====================================================
-- course_id를 실제 ID로 변경하세요
SELECT
  e.id,
  e.student_id,
  p.name as student_name,
  p.email as student_email,
  e.status,
  e.enrolled_at,
  e.updated_at
FROM enrollments e
JOIN profiles p ON e.student_id = p.id
-- WHERE e.course_id = 'YOUR_COURSE_ID_HERE'  -- 주석 해제하고 ID 입력
ORDER BY e.enrolled_at DESC;

-- =====================================================
-- 3. 중복 enrollment 실시간 확인
-- =====================================================
SELECT
  e.course_id,
  c.title as course_title,
  e.student_id,
  p.name as student_name,
  COUNT(*) as enrollment_count,
  STRING_AGG(e.id::text, ', ' ORDER BY e.enrolled_at) as enrollment_ids,
  STRING_AGG(e.status, ', ' ORDER BY e.enrolled_at) as statuses,
  STRING_AGG(e.enrolled_at::text, ', ' ORDER BY e.enrolled_at) as enrolled_dates
FROM enrollments e
JOIN courses c ON e.course_id = c.id
JOIN profiles p ON e.student_id = p.id
GROUP BY e.course_id, c.title, e.student_id, p.name
HAVING COUNT(*) > 1
ORDER BY enrollment_count DESC;

-- =====================================================
-- 4. enrolled_count vs 실제 카운트 비교
-- =====================================================
SELECT
  c.id,
  c.title,
  c.enrolled_count as db_count,
  COUNT(e.id) FILTER (WHERE e.status = 'active') as actual_active,
  COUNT(e.id) FILTER (WHERE e.status = 'dropped') as dropped,
  COUNT(e.id) as total_enrollments,
  c.enrolled_count - COUNT(e.id) FILTER (WHERE e.status = 'active') as difference,
  CASE
    WHEN c.enrolled_count = COUNT(e.id) FILTER (WHERE e.status = 'active') THEN '✅ 정상'
    ELSE '❌ 불일치'
  END as status
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.enrolled_count
ORDER BY difference DESC;

-- =====================================================
-- 5. 트리거 존재 확인
-- =====================================================
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'enrollments'
ORDER BY trigger_name;
