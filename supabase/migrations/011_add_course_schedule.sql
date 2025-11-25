-- Add schedule column to courses table
-- This column stores weekly schedule as JSON array
-- Example: [{"dayOfWeek": 1, "startTime": "14:00", "endTime": "16:00"}]

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.courses.schedule IS 'Weekly schedule array: [{dayOfWeek: 0-6, startTime: "HH:mm", endTime: "HH:mm"}]';
