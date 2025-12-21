-- =====================================================
-- UPDATE WEEKS CONSTRAINT
-- =====================================================
-- This migration updates the weeks column constraint to limit
-- courses to a maximum of 10 weeks

-- Drop the old constraint
ALTER TABLE public.courses
DROP CONSTRAINT IF EXISTS courses_weeks_check;

-- Add the new constraint (1-10 weeks)
ALTER TABLE public.courses
ADD CONSTRAINT courses_weeks_check CHECK (weeks >= 1 AND weeks <= 10);

-- Update comment
COMMENT ON COLUMN public.courses.weeks IS 'Number of weeks the course will run (1-10 weeks)';
