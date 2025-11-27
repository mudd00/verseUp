-- =====================================================
-- 데이터 초기화 스크립트
-- 계정(profiles, auth.users)은 유지하고 모든 활동 데이터를 삭제합니다.
-- =====================================================

-- 실행 전 확인 메시지
DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE '데이터 초기화를 시작합니다.';
  RAISE NOTICE '계정은 유지되고 모든 활동 데이터가 삭제됩니다.';
  RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- 데이터 삭제 실행
-- =====================================================
DO $$
BEGIN
  -- 1. refunds 테이블 초기화
  DELETE FROM refunds;
  RAISE NOTICE '✓ refunds 테이블 초기화 완료';

  -- 2. chat_messages 테이블 초기화
  DELETE FROM chat_messages;
  RAISE NOTICE '✓ chat_messages 테이블 초기화 완료';

  -- 3. live_sessions 테이블 초기화
  DELETE FROM live_sessions;
  RAISE NOTICE '✓ live_sessions 테이블 초기화 완료';

  -- 4. enrollments 테이블 초기화
  DELETE FROM enrollments;
  RAISE NOTICE '✓ enrollments 테이블 초기화 완료';

  -- 5. payments 테이블 초기화
  DELETE FROM payments;
  RAISE NOTICE '✓ payments 테이블 초기화 완료';

  -- 6. courses 테이블 초기화
  DELETE FROM courses;
  RAISE NOTICE '✓ courses 테이블 초기화 완료';
END $$;

-- =====================================================
-- 7. 현재 상태 확인
-- =====================================================
DO $$
DECLARE
  refunds_count INTEGER;
  chat_messages_count INTEGER;
  live_sessions_count INTEGER;
  enrollments_count INTEGER;
  payments_count INTEGER;
  courses_count INTEGER;
  profiles_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO refunds_count FROM refunds;
  SELECT COUNT(*) INTO chat_messages_count FROM chat_messages;
  SELECT COUNT(*) INTO live_sessions_count FROM live_sessions;
  SELECT COUNT(*) INTO enrollments_count FROM enrollments;
  SELECT COUNT(*) INTO payments_count FROM payments;
  SELECT COUNT(*) INTO courses_count FROM courses;
  SELECT COUNT(*) INTO profiles_count FROM profiles;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '초기화 완료 - 현재 데이터 상태:';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'refunds: % 건', refunds_count;
  RAISE NOTICE 'chat_messages: % 건', chat_messages_count;
  RAISE NOTICE 'live_sessions: % 건', live_sessions_count;
  RAISE NOTICE 'enrollments: % 건', enrollments_count;
  RAISE NOTICE 'payments: % 건', payments_count;
  RAISE NOTICE 'courses: % 건', courses_count;
  RAISE NOTICE '';
  RAISE NOTICE '계정(profiles): % 개 (유지됨)', profiles_count;
  RAISE NOTICE '=================================================';
  RAISE NOTICE '데이터 초기화가 완료되었습니다.';
  RAISE NOTICE '=================================================';
END $$;
