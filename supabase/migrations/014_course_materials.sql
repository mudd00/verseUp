-- =====================================================
-- COURSE MATERIALS TABLE
-- =====================================================
-- Stores course materials (files uploaded by instructors)

CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS course_materials_course_id_idx ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS course_materials_uploaded_by_idx ON public.course_materials(uploaded_by);
CREATE INDEX IF NOT EXISTS course_materials_created_at_idx ON public.course_materials(created_at);

-- Trigger to update updated_at
CREATE TRIGGER update_course_materials_updated_at
  BEFORE UPDATE ON public.course_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES FOR COURSE MATERIALS
-- =====================================================

-- Enable RLS
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view materials for courses they're enrolled in or teaching
CREATE POLICY "Users can view materials for their courses"
  ON public.course_materials
  FOR SELECT
  USING (
    -- Instructor can view their own course materials
    course_id IN (
      SELECT id FROM public.courses WHERE instructor_id = auth.uid()
    )
    OR
    -- Students can view materials for enrolled courses
    course_id IN (
      SELECT course_id FROM public.enrollments
      WHERE student_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Only instructors can upload materials to their own courses
CREATE POLICY "Instructors can upload materials to their courses"
  ON public.course_materials
  FOR INSERT
  WITH CHECK (
    course_id IN (
      SELECT id FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- Policy: Only instructors can update materials in their own courses
CREATE POLICY "Instructors can update their course materials"
  ON public.course_materials
  FOR UPDATE
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- Policy: Only instructors can delete materials from their own courses
CREATE POLICY "Instructors can delete their course materials"
  ON public.course_materials
  FOR DELETE
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE instructor_id = auth.uid()
    )
  );
