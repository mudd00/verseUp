-- Ensure test accounts have profiles with correct roles
-- auth.users에는 있지만 profiles에 없는 계정들을 위해 프로필 생성

-- instructor@test.com 계정의 프로필 생성 또는 업데이트
INSERT INTO profiles (id, email, name, role, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', 'Instructor'),
  'instructor',
  u.created_at,
  NOW()
FROM auth.users u
WHERE u.email = 'instructor@test.com'
ON CONFLICT (id)
DO UPDATE SET
  role = 'instructor',
  updated_at = NOW();

-- student@test.com 계정의 프로필 생성 또는 업데이트
INSERT INTO profiles (id, email, name, role, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', 'Student'),
  'student',
  u.created_at,
  NOW()
FROM auth.users u
WHERE u.email = 'student@test.com'
ON CONFLICT (id)
DO UPDATE SET
  role = 'student',
  updated_at = NOW();

-- 확인용 주석:
-- 이 마이그레이션은 auth.users에는 있지만 profiles에 없는 테스트 계정의 프로필을 생성합니다.
-- instructor@test.com으로 로그인한 사용자가 강의 자료를 업로드할 수 있도록 합니다.
