-- =====================================================
-- 특정 사용자의 데이터만 초기화
-- =====================================================
-- 사용법: {user_email}을 실제 이메일로 변경하여 실행

-- 삭제할 사용자 이메일을 변수로 설정
DO $$
DECLARE
  target_email TEXT := 'test@test.com'; -- 여기를 변경하세요
  target_user_id UUID;
BEGIN
  -- 사용자 ID 조회
  SELECT id INTO target_user_id
  FROM profiles
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION '사용자를 찾을 수 없습니다: %', target_email;
  END IF;

  RAISE NOTICE '사용자 정보: % (ID: %)', target_email, target_user_id;

  -- 1. 환불 내역 삭제
  DELETE FROM refunds WHERE user_id = target_user_id;
  RAISE NOTICE '✓ 환불 내역 삭제 완료';

  -- 2. 결제 내역 삭제
  DELETE FROM payments WHERE user_id = target_user_id;
  RAISE NOTICE '✓ 결제 내역 삭제 완료';

  -- 3. 수강 신청 내역 삭제
  DELETE FROM enrollments WHERE student_id = target_user_id;
  RAISE NOTICE '✓ 수강 신청 내역 삭제 완료';

  -- 4. 채팅 메시지 삭제
  DELETE FROM chat_messages WHERE user_id = target_user_id;
  RAISE NOTICE '✓ 채팅 메시지 삭제 완료';

  -- 5. 강사인 경우: 개설한 강의 삭제 (CASCADE로 관련 데이터 자동 삭제)
  DELETE FROM courses WHERE instructor_id = target_user_id;
  RAISE NOTICE '✓ 개설 강의 삭제 완료';

  RAISE NOTICE '=================================================';
  RAISE NOTICE '% 사용자의 모든 활동 데이터가 삭제되었습니다.', target_email;
  RAISE NOTICE '계정은 유지됩니다.';
  RAISE NOTICE '=================================================';
END $$;
