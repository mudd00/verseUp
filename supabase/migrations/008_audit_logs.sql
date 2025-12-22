-- =====================================================
-- AUDIT LOGS SCHEMA
-- =====================================================
-- This migration creates the audit logging system for tracking important actions
-- Helps with security monitoring, compliance, and debugging

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
-- Stores audit trail of important system actions

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Action details
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,

  -- Data snapshots
  old_values JSONB,
  new_values JSONB,

  -- Request metadata
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(table_name, record_id);

-- Comments
COMMENT ON TABLE public.audit_logs IS 'Audit trail of important system actions and changes';
COMMENT ON COLUMN public.audit_logs.action IS 'Type of action performed (e.g., create, update, delete, login)';
COMMENT ON COLUMN public.audit_logs.table_name IS 'Database table affected by the action';
COMMENT ON COLUMN public.audit_logs.record_id IS 'ID of the affected record';
COMMENT ON COLUMN public.audit_logs.old_values IS 'JSON snapshot of values before the change';
COMMENT ON COLUMN public.audit_logs.new_values IS 'JSON snapshot of values after the change';

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- Policy: Service can insert audit logs
CREATE POLICY "Service can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- AUDIT HELPER FUNCTIONS
-- =====================================================

-- Function: Create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  )
  VALUES (
    p_user_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Audit profile role changes
CREATE OR REPLACE FUNCTION audit_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    )
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

-- Function: Audit course status changes
CREATE OR REPLACE FUNCTION audit_course_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    )
    VALUES (
      auth.uid(),
      'course_status_changed',
      'courses',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Audit enrollment status changes
CREATE OR REPLACE FUNCTION audit_enrollment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    )
    VALUES (
      auth.uid(),
      'enrollment_status_changed',
      'enrollments',
      NEW.id,
      jsonb_build_object(
        'status', OLD.status,
        'student_id', OLD.student_id,
        'course_id', OLD.course_id
      ),
      jsonb_build_object(
        'status', NEW.status,
        'student_id', NEW.student_id,
        'course_id', NEW.course_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUDIT TRIGGERS
-- =====================================================

-- Trigger: Audit profile role changes
CREATE TRIGGER audit_profile_role_change_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION audit_profile_role_change();

-- Trigger: Audit course status changes
CREATE TRIGGER audit_course_status_change_trigger
  AFTER UPDATE ON public.courses
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION audit_course_status_change();

-- Trigger: Audit enrollment status changes
CREATE TRIGGER audit_enrollment_status_change_trigger
  AFTER UPDATE ON public.enrollments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION audit_enrollment_status_change();

-- Comments on functions
COMMENT ON FUNCTION create_audit_log IS 'Create a new audit log entry';
COMMENT ON FUNCTION audit_profile_role_change IS 'Automatically log profile role changes';
COMMENT ON FUNCTION audit_course_status_change IS 'Automatically log course status changes';
COMMENT ON FUNCTION audit_enrollment_status_change IS 'Automatically log enrollment status changes';
