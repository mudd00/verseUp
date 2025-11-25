-- VerseUp Additional Improvements
-- Optional enhancements for better data integrity and performance

-- =====================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on role for faster role-based queries
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Composite index for active enrollments
CREATE INDEX IF NOT EXISTS enrollments_student_status_idx
  ON public.enrollments(student_id, status);

-- Index for live session status queries
CREATE INDEX IF NOT EXISTS live_sessions_status_scheduled_idx
  ON public.live_sessions(status, scheduled_at);

-- =====================================================
-- ADDITIONAL HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is instructor or admin
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

-- Function to check if user is admin
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

-- Function to get user role
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
-- ENROLLMENT CAPACITY CHECK
-- =====================================================

-- Function to check if course has available slots before enrollment
CREATE OR REPLACE FUNCTION check_enrollment_capacity()
RETURNS TRIGGER AS $$
DECLARE
  course_max INTEGER;
  course_enrolled INTEGER;
BEGIN
  SELECT max_students, enrolled_count
  INTO course_max, course_enrolled
  FROM public.courses
  WHERE id = NEW.course_id;

  IF course_enrolled >= course_max THEN
    RAISE EXCEPTION 'Course is full (% / %)', course_enrolled, course_max;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check capacity before enrollment
CREATE TRIGGER check_enrollment_capacity_trigger
  BEFORE INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION check_enrollment_capacity();

-- =====================================================
-- PREVENT ROLE ESCALATION
-- =====================================================

-- Function to prevent users from escalating their own role to admin
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is trying to update their own profile
  IF NEW.id = auth.uid() THEN
    -- If they're trying to change role to admin
    IF NEW.role = 'admin' AND OLD.role != 'admin' THEN
      -- Only allow if current user is already an admin
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Cannot escalate role to admin';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent role escalation
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- =====================================================
-- AUDIT LOG TABLE (Optional)
-- =====================================================

-- Table to track important actions for security
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role != NEW.role THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      auth.uid(),
      'role_changed',
      'profiles',
      NEW.id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log role changes
CREATE TRIGGER log_role_change_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION log_role_change();

-- =====================================================
-- HELPFUL VIEWS
-- =====================================================

-- View to see course statistics
CREATE OR REPLACE VIEW course_statistics AS
SELECT
  c.id,
  c.title,
  c.instructor_id,
  p.name as instructor_name,
  c.max_students,
  c.enrolled_count,
  c.enrolled_count::FLOAT / c.max_students * 100 as enrollment_percentage,
  (c.max_students - c.enrolled_count) as available_slots,
  COUNT(DISTINCT ls.id) as session_count,
  c.start_date,
  c.end_date,
  c.created_at
FROM public.courses c
LEFT JOIN public.profiles p ON p.id = c.instructor_id
LEFT JOIN public.live_sessions ls ON ls.course_id = c.id
GROUP BY c.id, p.name;

-- View to see user enrollment summary
CREATE OR REPLACE VIEW user_enrollment_summary AS
SELECT
  p.id as user_id,
  p.name,
  p.email,
  p.role,
  COUNT(CASE WHEN e.status = 'active' THEN 1 END) as active_enrollments,
  COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completed_courses,
  COUNT(CASE WHEN e.status = 'dropped' THEN 1 END) as dropped_courses,
  COUNT(e.id) as total_enrollments
FROM public.profiles p
LEFT JOIN public.enrollments e ON e.student_id = p.id
WHERE p.role = 'student'
GROUP BY p.id;
