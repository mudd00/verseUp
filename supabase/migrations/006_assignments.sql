-- =====================================================
-- ASSIGNMENTS AND SUBMISSIONS SCHEMA
-- =====================================================
-- This migration creates the assignment system with submissions and grading
-- Includes storage bucket setup, RLS policies, and database tables

-- =====================================================
-- ASSIGNMENTS TABLE
-- =====================================================
-- Stores assignments created by instructors for their courses

CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  week_number INTEGER CHECK (week_number BETWEEN 1 AND 10),

  -- Assignment details
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100 CHECK (max_score >= 0),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_course_week ON public.assignments(course_id, week_number);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_week ON public.assignments(week_number);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_created_at ON public.assignments(created_at DESC);

-- Comments
COMMENT ON TABLE public.assignments IS 'Assignments created by instructors for courses';
COMMENT ON COLUMN public.assignments.week_number IS 'Week number (1-10) for organizing assignments by course week';
COMMENT ON COLUMN public.assignments.max_score IS 'Maximum score for this assignment';
COMMENT ON COLUMN public.assignments.due_date IS 'Assignment submission deadline';

-- =====================================================
-- ASSIGNMENT SUBMISSIONS TABLE
-- =====================================================
-- Stores student submissions and grading information

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Submission file
  file_url TEXT,

  -- Grading information
  score INTEGER CHECK (score >= 0),
  feedback TEXT,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Timestamps
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one submission per student per assignment
  CONSTRAINT unique_assignment_student UNIQUE (assignment_id, student_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student ON public.assignment_submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_graded ON public.assignment_submissions(graded_at);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.assignment_submissions(submitted_at DESC);

-- Comments
COMMENT ON TABLE public.assignment_submissions IS 'Student submissions and grading for assignments';
COMMENT ON COLUMN public.assignment_submissions.file_url IS 'Storage URL to the submitted file';
COMMENT ON COLUMN public.assignment_submissions.score IS 'Graded score for this submission';
COMMENT ON COLUMN public.assignment_submissions.graded_by IS 'Instructor who graded the submission';
COMMENT ON CONSTRAINT unique_assignment_student ON public.assignment_submissions IS 'Ensures each student can only submit once per assignment';

-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Students can upload their assignment submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can view assignment submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their own ungraded submissions" ON storage.objects;

-- Create storage bucket for assignment submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-submissions',
  'assignment-submissions',
  false,
  20971520, -- 20MB in bytes
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
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STORAGE RLS POLICIES
-- =====================================================
-- Folder structure: {assignmentId}/{studentId}/{filename}

-- Policy: Students can upload to their own folder
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

-- Policy: Students can view their own submissions
CREATE POLICY "Students can view their own submissions"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assignment-submissions' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Policy: Instructors can view all submissions for their assignments
CREATE POLICY "Instructors can view assignment submissions"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assignment-submissions' AND
    EXISTS (
      SELECT 1 FROM public.assignments a
      INNER JOIN public.courses c ON c.id = a.course_id
      WHERE a.id::text = (storage.foldername(name))[1]
        AND c.instructor_id = auth.uid()
    )
  );

-- Policy: Students can delete their own ungraded submissions
CREATE POLICY "Students can delete their own ungraded submissions"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assignment-submissions' AND
    (storage.foldername(name))[2] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.assignment_submissions s
      WHERE s.student_id = auth.uid()
        AND s.file_url LIKE '%' || name || '%'
        AND s.graded_at IS NULL
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update assignments.updated_at timestamp
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update assignment_submissions.updated_at timestamp
CREATE TRIGGER update_assignment_submissions_updated_at
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES FOR ASSIGNMENTS
-- =====================================================

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Assignments policies
CREATE POLICY "Students can view assignments for enrolled courses"
  ON public.assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = assignments.course_id
        AND enrollments.student_id = auth.uid()
        AND enrollments.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = assignments.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can create assignments for their courses"
  ON public.assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_id
        AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update their assignments"
  ON public.assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = assignments.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can delete their assignments"
  ON public.assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = assignments.course_id
        AND courses.instructor_id = auth.uid()
    )
  );

-- Assignment submissions policies
CREATE POLICY "Students can view their own submissions and instructors can view all"
  ON public.assignment_submissions FOR SELECT
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      INNER JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_submissions.assignment_id
        AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can submit assignments"
  ON public.assignment_submissions FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      INNER JOIN public.assignments a ON a.course_id = e.course_id
      WHERE a.id = assignment_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

CREATE POLICY "Students can update their own ungraded submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (
    auth.uid() = student_id
    AND graded_at IS NULL
  );

CREATE POLICY "Instructors can grade submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      INNER JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_submissions.assignment_id
        AND c.instructor_id = auth.uid()
    )
  );
