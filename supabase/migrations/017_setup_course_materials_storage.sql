-- =====================================================
-- COURSE MATERIALS STORAGE BUCKET SETUP
-- =====================================================
-- This migration ensures the course-materials storage bucket
-- is properly configured with the correct policies

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Instructors can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course materials" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course materials" ON storage.objects;

-- Create storage bucket for course materials (if not exists)
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

-- Storage policy: Instructors can upload to their course folders
CREATE POLICY "Instructors can upload course materials"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'course-materials' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- Storage policy: Instructors can update their course materials
CREATE POLICY "Instructors can update course materials"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'course-materials' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- Storage policy: Instructors can delete their course materials
CREATE POLICY "Instructors can delete course materials"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'course-materials' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- Storage policy: Anyone can view course materials (public bucket)
CREATE POLICY "Anyone can view course materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-materials');
