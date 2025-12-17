-- Assignments Table
-- 과제 시스템을 위한 테이블

CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT, -- 과제 설명 및 지시사항
  max_score INTEGER DEFAULT 100, -- 만점
  due_date TIMESTAMPTZ, -- 제출 기한
  allow_late_submission BOOLEAN DEFAULT FALSE,
  late_penalty_percent INTEGER DEFAULT 0, -- 지각 제출 감점 비율 (%)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assignment Submissions Table
-- 과제 제출 테이블

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT, -- 제출 내용
  file_url VARCHAR(500), -- 제출 파일 URL
  file_name VARCHAR(255), -- 파일 이름
  file_size INTEGER, -- 파일 크기 (bytes)
  file_type VARCHAR(100), -- 파일 MIME 타입
  status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'graded', 'late'
  score INTEGER, -- 채점 점수
  feedback TEXT, -- 강사 피드백
  graded_at TIMESTAMPTZ, -- 채점 시각
  graded_by UUID REFERENCES auth.users(id), -- 채점한 강사
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, student_id) -- 한 학생당 하나의 제출만 가능
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_instructor_id ON public.assignments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON public.assignment_submissions(status);

-- RLS Policies for assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Anyone enrolled in the course can view assignments
CREATE POLICY "Enrolled students can view assignments"
  ON public.assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = assignments.course_id
        AND enrollments.student_id = auth.uid()
        AND enrollments.status = 'active'
    )
    OR auth.uid() = instructor_id
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  );

-- Instructors can insert assignments for their courses
CREATE POLICY "Instructors can create assignments"
  ON public.assignments
  FOR INSERT
  WITH CHECK (auth.uid() = instructor_id);

-- Instructors can update their own assignments
CREATE POLICY "Instructors can update their assignments"
  ON public.assignments
  FOR UPDATE
  USING (auth.uid() = instructor_id);

-- Instructors can delete their own assignments
CREATE POLICY "Instructors can delete their assignments"
  ON public.assignments
  FOR DELETE
  USING (auth.uid() = instructor_id);

-- RLS Policies for assignment_submissions
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view their own submissions, instructors can view all submissions for their course
CREATE POLICY "Students can view their own submissions"
  ON public.assignment_submissions
  FOR SELECT
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_submissions.assignment_id
        AND assignments.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  );

-- Students can insert their own submissions
CREATE POLICY "Students can submit assignments"
  ON public.assignment_submissions
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = (
        SELECT course_id FROM public.assignments WHERE id = assignment_id
      )
      AND enrollments.student_id = auth.uid()
      AND enrollments.status = 'active'
    )
  );

-- Students can update their own submissions (before grading)
CREATE POLICY "Students can update their own submissions"
  ON public.assignment_submissions
  FOR UPDATE
  USING (auth.uid() = student_id AND status = 'submitted');

-- Instructors can update submissions (for grading)
CREATE POLICY "Instructors can grade submissions"
  ON public.assignment_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments
      WHERE assignments.id = assignment_submissions.assignment_id
        AND assignments.instructor_id = auth.uid()
    )
  );

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignments_updated_at_trigger
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignments_updated_at();

CREATE OR REPLACE FUNCTION update_assignment_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignment_submissions_updated_at_trigger
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_assignment_submissions_updated_at();
