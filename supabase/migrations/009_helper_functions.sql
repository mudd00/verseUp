-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================
-- Purpose: Utility functions for profile management, statistics, and synchronization
-- Contents:
--   1. Profile Management Functions (update_profile, delete_user)
--   2. Statistics Functions (get_profile_stats)
--   3. Role Check Functions (is_instructor_or_admin, is_admin, get_user_role)
--   4. Synchronization Functions (sync_course_enrolled_count)
--   5. Permission Grants
-- =====================================================

-- =====================================================
-- 1. PROFILE MANAGEMENT FUNCTIONS
-- =====================================================

-- Function: Update user profile information
-- Only the user themselves can update their profile (enforced by RLS)
CREATE OR REPLACE FUNCTION update_profile(
  user_id UUID,
  new_name TEXT DEFAULT NULL,
  new_bio TEXT DEFAULT NULL,
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
    bio = COALESCE(new_bio, bio),
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
    'bio', updated_profile.bio,
    'avatar_url', updated_profile.avatar_url,
    'created_at', updated_profile.created_at,
    'updated_at', updated_profile.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Delete user account
-- This will cascade delete all related data
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Prevent non-admins from deleting other users
  IF user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Only admins can delete other users';
    END IF;
  END IF;

  -- Delete from auth.users (this will cascade to profiles and all related tables)
  DELETE FROM auth.users WHERE id = user_id;

  -- Note: Due to ON DELETE CASCADE, this will also delete:
  -- - Profile from public.profiles
  -- - All enrollments (if student)
  -- - All courses created (if instructor)
  -- - All chat messages
  -- - All live sessions for instructor's courses
  -- - All assignments, submissions, materials, etc.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. STATISTICS FUNCTIONS
-- =====================================================

-- Function: Get user profile statistics based on role
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
-- 3. ROLE CHECK FUNCTIONS
-- =====================================================

-- Function: Check if user is instructor or admin
CREATE OR REPLACE FUNCTION is_instructor_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role IN ('instructor', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function: Get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;

  RETURN COALESCE(user_role, 'student');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 4. SYNCHRONIZATION FUNCTIONS
-- =====================================================

-- Function: Manually sync enrolled_count for courses
-- Can sync a specific course or all courses if course_id is NULL
CREATE OR REPLACE FUNCTION sync_course_enrolled_count(course_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
  course_record RECORD;
BEGIN
  -- If specific course_id provided, sync only that course
  IF course_id IS NOT NULL THEN
    UPDATE public.courses
    SET enrolled_count = (
      SELECT COUNT(*)
      FROM public.enrollments
      WHERE course_id = sync_course_enrolled_count.course_id
      AND status = 'active'
    )
    WHERE id = sync_course_enrolled_count.course_id;
  ELSE
    -- Sync all courses
    FOR course_record IN SELECT id FROM public.courses
    LOOP
      UPDATE public.courses
      SET enrolled_count = (
        SELECT COUNT(*)
        FROM public.enrollments
        WHERE course_id = course_record.id
        AND status = 'active'
      )
      WHERE id = course_record.id;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. PERMISSION GRANTS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_instructor_or_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_course_enrolled_count(UUID) TO authenticated;

-- Grant to service_role as well
GRANT EXECUTE ON FUNCTION update_profile(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_profile_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION is_instructor_or_admin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION sync_course_enrolled_count(UUID) TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION update_profile IS 'Updates user profile information (name, bio, avatar_url)';
COMMENT ON FUNCTION delete_user IS 'Deletes user account and all related data (admin or self only)';
COMMENT ON FUNCTION get_profile_stats IS 'Returns statistics for the user profile based on their role';
COMMENT ON FUNCTION is_instructor_or_admin IS 'Checks if user has instructor or admin role';
COMMENT ON FUNCTION is_admin IS 'Checks if user has admin role';
COMMENT ON FUNCTION get_user_role IS 'Returns the role of the specified user';
COMMENT ON FUNCTION sync_course_enrolled_count IS 'Manually syncs enrolled_count for specific course or all courses';
