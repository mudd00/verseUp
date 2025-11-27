-- =====================================================
-- 간단 버전: CASCADE 활용한 데이터 초기화
-- =====================================================
-- courses를 삭제하면 ON DELETE CASCADE로 인해
-- 관련된 enrollments, live_sessions, chat_messages가 자동 삭제됩니다.

-- 1. refunds 삭제 (payments를 참조하므로 먼저 삭제)
DELETE FROM refunds;

-- 2. payments 삭제
DELETE FROM payments;

-- 3. courses 삭제 (CASCADE로 enrollments, live_sessions, chat_messages 자동 삭제)
DELETE FROM courses;

-- 결과 확인
SELECT
  'courses' as table_name,
  COUNT(*) as count
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
SELECT 'profiles (유지됨)', COUNT(*) FROM profiles;
