-- VerseUp: 테스트 계정 profiles 수정
-- 이 migration은 테스트 계정의 profiles가 없으면 생성하고, 있으면 role을 업데이트합니다

-- 먼저 auth.users에서 테스트 계정의 실제 ID 확인 및 profiles 생성/업데이트
-- student@test.com
INSERT INTO public.profiles (id, email, name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', 'Student'),
  'student'
FROM auth.users
WHERE email = 'student@test.com'
ON CONFLICT (id)
DO UPDATE SET
  role = 'student',
  name = COALESCE(EXCLUDED.name, profiles.name);

-- instructor@test.com
INSERT INTO public.profiles (id, email, name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', 'Instructor'),
  'instructor'
FROM auth.users
WHERE email = 'instructor@test.com'
ON CONFLICT (id)
DO UPDATE SET
  role = 'instructor',
  name = COALESCE(EXCLUDED.name, profiles.name);

-- 결과 확인
SELECT
  p.id,
  p.email,
  p.name,
  p.role,
  u.email as auth_email
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.email IN ('student@test.com', 'instructor@test.com')
ORDER BY p.email;
