-- =====================================================
-- 현재 계정 및 데이터 현황 조회
-- =====================================================

-- 1. 모든 계정 정보
SELECT
  id,
  email,
  name,
  role,
  created_at
FROM profiles
ORDER BY created_at;

-- 2. 계정별 활동 데이터 현황
SELECT
  p.email,
  p.name,
  p.role,
  (SELECT COUNT(*) FROM courses WHERE instructor_id = p.id) as "개설한 강의 수",
  (SELECT COUNT(*) FROM enrollments WHERE student_id = p.id AND status = 'active') as "수강 중인 강의 수",
  (SELECT COUNT(*) FROM payments WHERE user_id = p.id) as "결제 건수",
  (SELECT COUNT(*) FROM refunds WHERE user_id = p.id) as "환불 건수"
FROM profiles p
ORDER BY p.created_at;

-- 3. 전체 데이터 통계
SELECT
  'courses' as "테이블",
  COUNT(*) as "데이터 수"
FROM courses
UNION ALL
SELECT 'enrollments', COUNT(*) FROM enrollments
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'refunds', COUNT(*) FROM refunds
UNION ALL
SELECT 'live_sessions', COUNT(*) FROM live_sessions
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles;
