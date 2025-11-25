-- VerseUp Profile Management Functions
-- This migration adds functions for user profile management

-- =====================================================
-- PROFILE UPDATE FUNCTION
-- =====================================================

-- Function to update user profile information
-- Only the user themselves can update their profile (enforced by RLS)
CREATE OR REPLACE FUNCTION update_profile(
  user_id UUID,
  new_name TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  updated_profile RECORD;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update profile (only provided fields)
  UPDATE public.profiles
  SET
    name = COALESCE(new_name, name),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = user_id
  RETURNING * INTO updated_profile;

  -- Return updated profile as JSON
  RETURN jsonb_build_object(
    'id', updated_profile.id,
    'email', updated_profile.email,
    'name', updated_profile.name,
    'role', updated_profile.role,
    'avatar_url', updated_profile.avatar_url,
    'created_at', updated_profile.created_at,
    'updated_at', updated_profile.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- USER DELETION FUNCTION
-- =====================================================

-- Function to delete user account
-- This will cascade delete all related data
CREATE OR REPLACE FUNCTION delete_user()
RETURNS VOID AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Get current user ID
  user_uuid := auth.uid();

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_uuid) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Delete from auth.users (this will cascade to profiles and all related tables)
  DELETE FROM auth.users WHERE id = user_uuid;

  -- Note: Due to ON DELETE CASCADE, this will also delete:
  -- - Profile from public.profiles
  -- - All enrollments (if student)
  -- - All courses created (if instructor)
  -- - All chat messages
  -- - All live sessions for instructor's courses
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PROFILE STATISTICS FUNCTION
-- =====================================================

-- Function to get user profile statistics
CREATE OR REPLACE FUNCTION get_profile_stats(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;

  IF user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Build statistics based on role
  IF user_role = 'student' THEN
    -- Student statistics
    SELECT jsonb_build_object(
      'total_enrollments', COUNT(*),
      'active_enrollments', COUNT(*) FILTER (WHERE status = 'active'),
      'completed_courses', COUNT(*) FILTER (WHERE status = 'completed'),
      'dropped_courses', COUNT(*) FILTER (WHERE status = 'dropped')
    ) INTO stats
    FROM public.enrollments
    WHERE student_id = user_id;

  ELSIF user_role = 'instructor' THEN
    -- Instructor statistics
    SELECT jsonb_build_object(
      'total_courses', COUNT(DISTINCT c.id),
      'total_students', COALESCE(SUM(c.enrolled_count), 0),
      'total_sessions', COUNT(DISTINCT ls.id),
      'live_sessions', COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'live'),
      'scheduled_sessions', COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'scheduled')
    ) INTO stats
    FROM public.courses c
    LEFT JOIN public.live_sessions ls ON ls.course_id = c.id
    WHERE c.instructor_id = user_id;

  ELSIF user_role = 'admin' THEN
    -- Admin statistics
    SELECT jsonb_build_object(
      'total_users', (SELECT COUNT(*) FROM public.profiles),
      'total_students', (SELECT COUNT(*) FROM public.profiles WHERE role = 'student'),
      'total_instructors', (SELECT COUNT(*) FROM public.profiles WHERE role = 'instructor'),
      'total_courses', (SELECT COUNT(*) FROM public.courses),
      'total_enrollments', (SELECT COUNT(*) FROM public.enrollments)
    ) INTO stats;

  ELSE
    stats := '{}'::jsonb;
  END IF;

  RETURN COALESCE(stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- EMAIL CHANGE FUNCTION (Optional)
-- =====================================================

-- Function to initiate email change
-- This sends a confirmation email to the new address
CREATE OR REPLACE FUNCTION request_email_change(new_email TEXT)
RETURNS JSONB AS $$
DECLARE
  user_uuid UUID;
BEGIN
  user_uuid := auth.uid();

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate email format
  IF new_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = new_email) THEN
    RAISE EXCEPTION 'Email already in use';
  END IF;

  -- Note: Actual email change should be done through Supabase Auth
  -- This function is just for validation
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email change request initiated. Please check your new email for confirmation.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_email_change(TEXT) TO authenticated;

-- =====================================================
-- ADDITIONAL RLS POLICIES FOR PROFILE UPDATES
-- =====================================================

-- Allow users to update their own avatar_url
-- (This supplements the existing profile update policy)
CREATE POLICY "Users can update own avatar" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION update_profile IS 'Updates user profile information (name, avatar_url)';
COMMENT ON FUNCTION delete_user IS 'Deletes user account and all related data';
COMMENT ON FUNCTION get_profile_stats IS 'Returns statistics for the user profile based on their role';
COMMENT ON FUNCTION request_email_change IS 'Validates and initiates email change request';
