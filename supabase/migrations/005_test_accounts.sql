-- VerseUp Test Accounts
-- This migration creates test accounts for development and testing

-- =====================================================
-- CREATE TEST ACCOUNTS
-- =====================================================

-- Note: These test accounts should ONLY be used in development/testing environments
-- Delete or disable these accounts in production!

-- Test Student Account
-- Email: student@test.com
-- Password: test123
-- Role: student

-- Test Instructor Account
-- Email: instructor@test.com
-- Password: test123
-- Role: instructor

-- =====================================================
-- FUNCTION TO CREATE TEST USERS
-- =====================================================

CREATE OR REPLACE FUNCTION create_test_accounts()
RETURNS TABLE(email TEXT, password TEXT, role TEXT, message TEXT) AS $$
BEGIN
  -- Check if test accounts already exist
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email IN ('student@test.com', 'instructor@test.com')) THEN
    RETURN QUERY SELECT
      ''::TEXT as email,
      ''::TEXT as password,
      ''::TEXT as role,
      'Test accounts already exist'::TEXT as message;
    RETURN;
  END IF;

  -- Insert test student profile
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    gen_random_uuid(),
    'student@test.com',
    '테스트 학생',
    'student'
  )
  ON CONFLICT (email) DO NOTHING;

  -- Insert test instructor profile
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    gen_random_uuid(),
    'instructor@test.com',
    '테스트 강사',
    'instructor'
  )
  ON CONFLICT (email) DO NOTHING;

  -- Return test account info
  RETURN QUERY SELECT
    'student@test.com'::TEXT as email,
    'test123'::TEXT as password,
    'student'::TEXT as role,
    'Test student account created'::TEXT as message
  UNION ALL
  SELECT
    'instructor@test.com'::TEXT,
    'test123'::TEXT,
    'instructor'::TEXT,
    'Test instructor account created'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================

-- To create test accounts, you need to:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" → "Create new user"
-- 3. Create two users with the following credentials:

--    Student Account:
--    Email: student@test.com
--    Password: test123
--    (Check "Auto Confirm User" to skip email verification)
--    User Metadata: {"name": "테스트 학생", "role": "student"}

--    Instructor Account:
--    Email: instructor@test.com
--    Password: test123
--    (Check "Auto Confirm User" to skip email verification)
--    User Metadata: {"name": "테스트 강사", "role": "instructor"}

-- 4. The trigger will automatically create profiles for these users

-- =====================================================
-- ALTERNATIVE: Manual Profile Creation
-- =====================================================

-- If you created auth.users manually without metadata, run these:

-- For Student (replace 'student-user-id' with actual UUID from auth.users)
-- INSERT INTO public.profiles (id, email, name, role)
-- VALUES (
--   'student-user-id'::UUID,
--   'student@test.com',
--   '테스트 학생',
--   'student'
-- )
-- ON CONFLICT (email) DO UPDATE SET name = '테스트 학생', role = 'student';

-- For Instructor (replace 'instructor-user-id' with actual UUID from auth.users)
-- INSERT INTO public.profiles (id, email, name, role)
-- VALUES (
--   'instructor-user-id'::UUID,
--   'instructor@test.com',
--   '테스트 강사',
--   'instructor'
-- )
-- ON CONFLICT (email) DO UPDATE SET name = '테스트 강사', role = 'instructor';

-- =====================================================
-- VERIFY TEST ACCOUNTS
-- =====================================================

-- Run this to check if test accounts exist:
-- SELECT p.id, p.email, p.name, p.role, p.created_at
-- FROM public.profiles p
-- WHERE p.email IN ('student@test.com', 'instructor@test.com');

-- =====================================================
-- DELETE TEST ACCOUNTS (For Production)
-- =====================================================

-- IMPORTANT: Delete test accounts before deploying to production!
-- Uncomment and run these commands:

-- DELETE FROM auth.users
-- WHERE email IN ('student@test.com', 'instructor@test.com');

-- DELETE FROM public.profiles
-- WHERE email IN ('student@test.com', 'instructor@test.com');

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION create_test_accounts IS 'Creates test student and instructor accounts for development';
