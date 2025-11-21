-- VerseUp: 테스트 계정에 role 설정
-- 이 migration은 테스트 계정들의 profiles 테이블에 role을 설정합니다

-- 학생 테스트 계정 role 설정
UPDATE public.profiles
SET role = 'student'
WHERE email = 'student@test.com'
AND role IS NULL;

-- 강사 테스트 계정 role 설정
UPDATE public.profiles
SET role = 'instructor'
WHERE email = 'instructor@test.com'
AND role IS NULL;

-- 변경사항 확인을 위한 SELECT (선택사항, 실행 결과 확인용)
-- SELECT id, email, name, role FROM public.profiles WHERE email IN ('student@test.com', 'instructor@test.com');
