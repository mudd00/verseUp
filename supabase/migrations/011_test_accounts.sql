-- =====================================================
-- TEST ACCOUNTS
-- =====================================================
-- Purpose: Create test accounts for development environment
-- ⚠️  WARNING: DEVELOPMENT ONLY - DO NOT RUN IN PRODUCTION
-- Contents:
--   1. Test account profile creation/update
--   2. Manual account creation instructions
--   3. Cleanup instructions for production
-- =====================================================

-- =====================================================
-- ⚠️  PRODUCTION WARNING
-- =====================================================
-- IMPORTANT: This migration creates test accounts for DEVELOPMENT ONLY
-- Before deploying to production:
--   1. Comment out or delete this file
--   2. Or ensure this migration is NOT run in production
--   3. Delete test accounts if they were accidentally created
-- =====================================================

-- =====================================================
-- 1. TEST ACCOUNT PROFILE CREATION
-- =====================================================

-- Create or update test instructor profile
-- Note: This assumes the auth.users account already exists
-- If the account doesn't exist in auth.users, this will do nothing
INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', '테스트 강사'),
  'instructor',
  u.created_at,
  NOW()
FROM auth.users u
WHERE u.email = 'instructor@test.com'
ON CONFLICT (id)
DO UPDATE SET
  role = 'instructor',
  name = COALESCE(EXCLUDED.name, '테스트 강사'),
  updated_at = NOW();

-- Create or update test student profile
INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', '테스트 학생'),
  'student',
  u.created_at,
  NOW()
FROM auth.users u
WHERE u.email = 'student@test.com'
ON CONFLICT (id)
DO UPDATE SET
  role = 'student',
  name = COALESCE(EXCLUDED.name, '테스트 학생'),
  updated_at = NOW();

-- =====================================================
-- 2. MANUAL ACCOUNT CREATION INSTRUCTIONS
-- =====================================================

-- The SQL above will only work if auth.users accounts already exist.
-- To create test accounts, follow these steps in Supabase Dashboard:

-- Step 1: Go to Supabase Dashboard → Authentication → Users
-- Step 2: Click "Add user" → "Create new user"
-- Step 3: Create the following two accounts:

-- ┌─────────────────────────────────────────────────────────────┐
-- │ Test Instructor Account                                     │
-- ├─────────────────────────────────────────────────────────────┤
-- │ Email:          instructor@test.com                         │
-- │ Password:       test123 (or your preferred test password)   │
-- │ Auto Confirm:   ✓ (check this to skip email verification)  │
-- │ User Metadata:  {"name": "테스트 강사", "role": "instructor"}│
-- └─────────────────────────────────────────────────────────────┘

-- ┌─────────────────────────────────────────────────────────────┐
-- │ Test Student Account                                        │
-- ├─────────────────────────────────────────────────────────────┤
-- │ Email:          student@test.com                            │
-- │ Password:       test123 (or your preferred test password)   │
-- │ Auto Confirm:   ✓ (check this to skip email verification)  │
-- │ User Metadata:  {"name": "테스트 학생", "role": "student"}  │
-- └─────────────────────────────────────────────────────────────┘

-- Step 4: After creating the accounts, run this migration
--         The trigger will automatically create profiles for these users

-- =====================================================
-- 3. ALTERNATIVE: SQL-BASED PROFILE CREATION
-- =====================================================

-- If you created auth.users manually without metadata, you can manually insert profiles:
-- Note: Replace 'INSTRUCTOR-USER-ID' and 'STUDENT-USER-ID' with actual UUIDs from auth.users

-- For Instructor:
-- INSERT INTO public.profiles (id, email, name, role)
-- SELECT id, email, '테스트 강사', 'instructor'
-- FROM auth.users
-- WHERE email = 'instructor@test.com'
-- ON CONFLICT (id) DO UPDATE SET
--   name = '테스트 강사',
--   role = 'instructor',
--   updated_at = NOW();

-- For Student:
-- INSERT INTO public.profiles (id, email, name, role)
-- SELECT id, email, '테스트 학생', 'student'
-- FROM auth.users
-- WHERE email = 'student@test.com'
-- ON CONFLICT (id) DO UPDATE SET
--   name = '테스트 학생',
--   role = 'student',
--   updated_at = NOW();

-- =====================================================
-- 4. VERIFY TEST ACCOUNTS
-- =====================================================

-- Run this query to verify test accounts were created:
-- SELECT
--   p.id,
--   p.email,
--   p.name,
--   p.role,
--   p.created_at,
--   CASE
--     WHEN u.id IS NOT NULL THEN 'Yes'
--     ELSE 'No (Profile only)'
--   END as has_auth_user
-- FROM public.profiles p
-- LEFT JOIN auth.users u ON u.id = p.id
-- WHERE p.email IN ('instructor@test.com', 'student@test.com')
-- ORDER BY p.role DESC;

-- =====================================================
-- 5. CLEANUP FOR PRODUCTION
-- =====================================================

-- ⚠️  CRITICAL: Run these commands before deploying to production!

-- Delete test accounts from auth.users (this will cascade to profiles)
-- DELETE FROM auth.users
-- WHERE email IN ('instructor@test.com', 'student@test.com');

-- Verify deletion:
-- SELECT COUNT(*) as remaining_test_accounts
-- FROM public.profiles
-- WHERE email IN ('instructor@test.com', 'student@test.com');
-- Expected result: 0

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.profiles IS '사용자 프로필 - 테스트 계정(instructor@test.com, student@test.com)은 개발 환경 전용';
