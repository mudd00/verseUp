-- =====================================================
-- Update Maximum Capacity to 20
-- =====================================================
-- This migration updates all capacity limits from 30 to 20

-- 1. Update existing classrooms capacity to 20
UPDATE public.classrooms
SET capacity = 20
WHERE capacity > 20;

-- 2. Update existing courses max_students to 20
UPDATE public.courses
SET max_students = 20
WHERE max_students > 20;

-- 3. Alter default values for future records
ALTER TABLE public.classrooms
ALTER COLUMN capacity SET DEFAULT 20;

ALTER TABLE public.courses
ALTER COLUMN max_students SET DEFAULT 20;

-- 4. Add comment for documentation
COMMENT ON COLUMN public.classrooms.capacity IS 'Maximum capacity: 20 students per classroom';
COMMENT ON COLUMN public.courses.max_students IS 'Maximum students: 20 per course';
