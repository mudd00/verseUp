-- =====================================================
-- COURSE MATERIALS SCHEMA AND STORAGE
-- =====================================================
-- This migration creates the course materials system for file uploads
-- Includes storage bucket setup, RLS policies, and database table

-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Instructors can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course materials" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course materials" ON storage.objects;
DROP POLICY IF EXISTS "Students can view enrolled course materials" ON storage.objects;

-- Create storage bucket for course materials
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials',
  true,
  52428800, -- 50MB in bytes
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STORAGE RLS POLICIES
-- =====================================================

-- Policy: Instructors can upload to their course folders
CREATE POLICY "Instructors can upload course materials"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'course-materials' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- Policy: Instructors can update their course materials
CREATE POLICY "Instructors can update course materials"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'course-materials' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- Policy: Instructors can delete their course materials
CREATE POLICY "Instructors can delete course materials"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'course-materials' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- Policy: Anyone can view course materials (public bucket)
CREATE POLICY "Anyone can view course materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-materials');

-- =====================================================
-- COURSE MATERIALS TABLE
-- =====================================================
-- Stores metadata for course materials uploaded by instructors

CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  week_number INTEGER CHECK (week_number BETWEEN 1 AND 10),

  -- File information
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_materials_course_week ON public.course_materials(course_id, week_number);
CREATE INDEX IF NOT EXISTS idx_course_materials_course ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_week ON public.course_materials(week_number);
CREATE INDEX IF NOT EXISTS idx_course_materials_created_at ON public.course_materials(created_at DESC);

-- Comments
COMMENT ON TABLE public.course_materials IS 'Course materials and files uploaded by instructors';
COMMENT ON COLUMN public.course_materials.week_number IS 'Week number (1-10) for organizing materials by course week';
COMMENT ON COLUMN public.course_materials.file_url IS 'Storage URL to the uploaded file';
COMMENT ON COLUMN public.course_materials.file_size IS 'File size in bytes';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update course_materials.updated_at timestamp
CREATE TRIGGER update_course_materials_updated_at
  BEFORE UPDATE ON public.course_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES FOR COURSE MATERIALS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view materials for courses they're enrolled in or teaching
CREATE POLICY "Users can view materials for their courses"
  ON public.course_materials FOR SELECT
  USING (
    -- Instructors can view their own course materials
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
CREATE POLICY "Instructors can create materials for their courses"
  ON public.course_materials FOR INSERT
  WITH CHECK (
    course_id IN (
      SELECT id FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- Policy: Only instructors can update materials in their own courses
CREATE POLICY "Instructors can update their course materials"
  ON public.course_materials FOR UPDATE
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- Policy: Only instructors can delete materials from their own courses
CREATE POLICY "Instructors can delete their course materials"
  ON public.course_materials FOR DELETE
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE instructor_id = auth.uid()
    )
  );
