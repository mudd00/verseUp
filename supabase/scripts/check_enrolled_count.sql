-- =====================================================
-- enrolled_count 확인 쿼리
-- =====================================================
-- 이 쿼리를 실행하여 enrolled_count가 정확한지 확인하세요

-- 1. 전체 통계
SELECT
  '전체 통계' as category,
  COUNT(*) as total_courses,
  SUM(enrolled_count) as total_enrolled_count,
  (SELECT COUNT(*) FROM enrollments WHERE status = 'active') as actual_active_enrollments
FROM courses;

-- 2. 불일치 강의 목록
SELECT
  c.id,
  c.title,
  c.enrolled_count as db_count,
  COUNT(e.id) FILTER (WHERE e.status = 'active') as actual_count,
  c.enrolled_count - COUNT(e.id) FILTER (WHERE e.status = 'active') as difference,
  c.max_students,
  CASE
    WHEN c.enrolled_count = COUNT(e.id) FILTER (WHERE e.status = 'active')
    THEN '✅ 일치'
    ELSE '❌ 불일치'
  END as status
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.enrolled_count, c.max_students
HAVING c.enrolled_count != COUNT(e.id) FILTER (WHERE e.status = 'active')
ORDER BY difference DESC;

-- 3. 중복 enrollment 확인
SELECT
  course_id,
  student_id,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as enrollment_ids,
  STRING_AGG(status, ', ') as statuses
FROM enrollments
GROUP BY course_id, student_id
HAVING COUNT(*) > 1;

-- 4. 모든 강의의 상세 현황
SELECT
  c.id,
  c.title,
  c.enrolled_count as db_count,
  COUNT(e.id) FILTER (WHERE e.status = 'active') as active_count,
  COUNT(e.id) FILTER (WHERE e.status = 'dropped') as dropped_count,
  COUNT(e.id) FILTER (WHERE e.status = 'completed') as completed_count,
  c.max_students,
  ROUND(c.enrolled_count::numeric / c.max_students * 100, 1) as fill_rate,
  CASE
    WHEN c.enrolled_count = COUNT(e.id) FILTER (WHERE e.status = 'active')
    THEN '✅'
    ELSE '❌'
  END as status
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.enrolled_count, c.max_students
ORDER BY c.created_at DESC;
