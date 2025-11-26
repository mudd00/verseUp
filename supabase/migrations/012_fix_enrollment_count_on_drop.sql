-- =====================================================
-- Fix enrolled_count decrement on status update to 'dropped'
-- =====================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS decrement_course_enrolled_count ON public.enrollments;

-- Create new function to handle both DELETE and UPDATE to 'dropped'
CREATE OR REPLACE FUNCTION update_enrolled_count_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When enrollment status changes from 'active' to 'dropped'
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'dropped' THEN
    UPDATE public.courses
    SET enrolled_count = GREATEST(0, enrolled_count - 1)
    WHERE id = OLD.course_id;
    RETURN NEW;
  END IF;

  -- When enrollment is deleted and it was active
  IF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.courses
    SET enrolled_count = GREATEST(0, enrolled_count - 1)
    WHERE id = OLD.course_id;
    RETURN OLD;
  END IF;

  -- When enrollment status changes from 'dropped' back to 'active' (re-enrollment)
  IF TG_OP = 'UPDATE' AND OLD.status = 'dropped' AND NEW.status = 'active' THEN
    UPDATE public.courses
    SET enrolled_count = enrolled_count + 1
    WHERE id = NEW.course_id;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for both UPDATE and DELETE
DROP TRIGGER IF EXISTS update_course_enrolled_count_on_status ON public.enrollments;
CREATE TRIGGER update_course_enrolled_count_on_status
  AFTER UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_enrolled_count_on_status_change();

-- Comment for documentation
COMMENT ON FUNCTION update_enrolled_count_on_status_change() IS
'Automatically updates course enrolled_count when:
1. Enrollment status changes from active to dropped (decrement)
2. Enrollment is deleted and was active (decrement)
3. Enrollment status changes from dropped to active (increment)';
