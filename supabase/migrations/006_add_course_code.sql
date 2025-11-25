-- Add course_code and additional fields to courses table
-- This migration adds a unique course code for each course along with additional metadata

-- =====================================================
-- ADD COURSE CODE AND ADDITIONAL FIELDS
-- =====================================================

-- Add course_code column (unique identifier like "CS101", "MATH201", etc.)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS course_code TEXT UNIQUE;

-- Add category column
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Add difficulty level column
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced'));

-- Add status column
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));

-- Add price column (0 for free courses)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0 CHECK (price >= 0);

-- Create index on course_code for faster lookups
CREATE INDEX IF NOT EXISTS courses_course_code_idx ON public.courses(course_code);

-- Create index on category
CREATE INDEX IF NOT EXISTS courses_category_idx ON public.courses(category);

-- Create index on status
CREATE INDEX IF NOT EXISTS courses_status_idx ON public.courses(status);

-- =====================================================
-- FUNCTION TO GENERATE COURSE CODE
-- =====================================================

-- Function to generate a unique course code based on title
CREATE OR REPLACE FUNCTION generate_course_code(course_title TEXT)
RETURNS TEXT AS $$
DECLARE
  code_prefix TEXT;
  random_suffix TEXT;
  new_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Extract first 3 characters of title, uppercase, remove special chars
  code_prefix := UPPER(REGEXP_REPLACE(LEFT(course_title, 3), '[^A-Z0-9]', '', 'g'));

  -- If prefix is too short, pad with 'X'
  WHILE LENGTH(code_prefix) < 3 LOOP
    code_prefix := code_prefix || 'X';
  END LOOP;

  -- Generate random 3-digit number
  LOOP
    random_suffix := LPAD((FLOOR(RANDOM() * 1000))::TEXT, 3, '0');
    new_code := code_prefix || random_suffix;

    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE course_code = new_code) THEN
      RETURN new_code;
    END IF;

    -- Prevent infinite loop
    counter := counter + 1;
    EXIT WHEN counter > 100;
  END LOOP;

  -- If all else fails, use UUID
  RETURN UPPER(LEFT(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 6));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION TO AUTO-GENERATE COURSE CODE ON INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION auto_generate_course_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.course_code IS NULL OR NEW.course_code = '' THEN
    NEW.course_code := generate_course_code(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER
-- =====================================================

-- Trigger to auto-generate course_code if not provided
DROP TRIGGER IF EXISTS auto_generate_course_code_trigger ON public.courses;
CREATE TRIGGER auto_generate_course_code_trigger
  BEFORE INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_course_code();

-- =====================================================
-- UPDATE EXISTING COURSES
-- =====================================================

-- Generate course codes for existing courses that don't have one
DO $$
DECLARE
  course_record RECORD;
BEGIN
  FOR course_record IN SELECT id, title FROM public.courses WHERE course_code IS NULL LOOP
    UPDATE public.courses
    SET course_code = generate_course_code(course_record.title)
    WHERE id = course_record.id;
  END LOOP;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN public.courses.course_code IS '고유 수강번호 (예: CS101, MATH201)';
COMMENT ON COLUMN public.courses.category IS '강의 카테고리 (예: programming, math, design)';
COMMENT ON COLUMN public.courses.level IS '난이도 (beginner, intermediate, advanced)';
COMMENT ON COLUMN public.courses.status IS '강의 상태 (draft, published, archived)';
COMMENT ON COLUMN public.courses.price IS '강의 가격 (0 = 무료)';
