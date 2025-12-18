-- =====================================================
-- ASSIGNMENT SUBMISSIONS STORAGE RLS POLICIES
-- =====================================================
-- This migration sets up RLS policies for student assignment submissions
-- NOTE: The bucket must be created manually via Supabase Dashboard first

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Students can upload their assignment submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can view assignment submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their own ungraded submissions" ON storage.objects;

-- =====================================================
-- RLS POLICIES FOR assignment-submissions BUCKET
-- =====================================================

-- Policy 1: Students can upload to their own folder
-- Folder structure: {assignmentId}/{studentId}/{filename}
CREATE POLICY "Students can upload their assignment submissions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assignment-submissions' AND
    (storage.foldername(name))[2] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.enrollments e
      INNER JOIN public.assignments a ON a.course_id = e.course_id
      WHERE a.id::text = (storage.foldername(name))[1]
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- Policy 2: Students can view their own submissions
CREATE POLICY "Students can view their own submissions"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assignment-submissions' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy 3: Instructors can view all submissions for their assignments
CREATE POLICY "Instructors can view assignment submissions"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assignment-submissions' AND
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.instructor_id = auth.uid()
    )
  );

-- Policy 4: Students can delete their own ungraded submissions
-- This allows students to replace files before grading
CREATE POLICY "Students can delete their own ungraded submissions"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assignment-submissions' AND
    (storage.foldername(name))[2] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.assignment_submissions s
      WHERE s.student_id = auth.uid()
        AND s.file_url LIKE '%' || name || '%'
        AND s.status IN ('submitted', 'late')
    )
  );

-- =====================================================
-- VERIFY BUCKET EXISTS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'assignment-submissions'
  ) THEN
    RAISE NOTICE 'WARNING: Bucket "assignment-submissions" does not exist. Please create it manually via Supabase Dashboard.';
    RAISE NOTICE 'Settings: Name=assignment-submissions, Public=false, File size limit=20MB';
  ELSE
    RAISE NOTICE 'SUCCESS: Bucket "assignment-submissions" exists. RLS policies have been created.';
  END IF;
END $$;
