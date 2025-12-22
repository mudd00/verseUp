-- 관리자 계정 생성 SQL 스크립트
-- Supabase SQL Editor에서 직접 실행하세요

-- 1. auth.users 테이블에 관리자 계정 생성
-- 주의: 이 방법은 Supabase에서 auth.users를 직접 수정할 수 없는 경우가 있습니다.
-- 그럴 경우 아래의 대안 방법을 사용하세요.

-- 방법 1: 회원가입을 먼저 하고 role만 업데이트 (권장)
-- 단계 1: 웹 UI에서 admin@test.com / test1234로 회원가입
-- 단계 2: 아래 SQL 실행하여 role을 admin으로 변경

UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@test.com';

-- 확인
SELECT id, email, name, role, created_at
FROM profiles
WHERE email = 'admin@test.com';


-- 방법 2: profiles 테이블이 없는 경우를 대비한 전체 스크립트
-- (이미 회원가입을 했고, profiles에 데이터가 있다면 위의 UPDATE만 실행하면 됩니다)

-- profiles에 데이터가 있는지 확인
-- SELECT * FROM profiles WHERE email = 'admin@test.com';

-- 만약 profiles에 데이터가 없다면 아래를 실행
-- (단, auth.users에는 이미 존재해야 함)
/*
INSERT INTO profiles (id, email, name, role, created_at, updated_at)
SELECT
  id,
  email,
  'Admin User' as name,
  'admin' as role,
  created_at,
  created_at as updated_at
FROM auth.users
WHERE email = 'admin@test.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin';
*/

-- 최종 확인: 모든 관리자 계정 조회
SELECT id, email, name, role, created_at
FROM profiles
WHERE role = 'admin';
