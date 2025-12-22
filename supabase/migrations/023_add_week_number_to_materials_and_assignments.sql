-- =====================================================
-- ADD WEEK_NUMBER TO COURSE MATERIALS AND ASSIGNMENTS
-- =====================================================
-- This migration adds week_number column to organize materials and assignments by week

-- Add week_number to course_materials table
ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS week_number INTEGER CHECK (week_number > 0);

-- Add index for performance
CREATE INDEX IF NOT EXISTS course_materials_week_number_idx ON public.course_materials(week_number);

-- Add week_number to assignments table
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS week_number INTEGER CHECK (week_number > 0);

-- Add index for performance
CREATE INDEX IF NOT EXISTS assignments_week_number_idx ON public.assignments(week_number);

-- Add comments
COMMENT ON COLUMN public.course_materials.week_number IS 'Week number for organizing materials (optional, NULL means general material)';
COMMENT ON COLUMN public.assignments.week_number IS 'Week number for organizing assignments (optional, NULL means general assignment)';
