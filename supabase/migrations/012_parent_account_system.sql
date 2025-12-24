-- =====================================================
-- PARENT ACCOUNT SYSTEM MIGRATION
-- =====================================================
-- Purpose: Creates tables and functions for parent monitoring system
-- Contents:
--   1. Update profiles role to include 'parent'
--   2. parent_student_links table (부모-자녀 연결)
--   3. attendance table (출석)
--   4. course_progress table (진도율)
--   5. cctv_sessions table (CCTV 세션)
--   6. cctv_view_logs table (시청 로그)
--   7. Helper functions
--   8. RLS Policies
-- =====================================================

-- =====================================================
-- 1. UPDATE PROFILES ROLE CHECK
-- =====================================================
-- Add 'parent' to allowed roles

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'instructor', 'admin', 'parent'));

COMMENT ON COLUMN public.profiles.role IS '사용자 역할 (student, instructor, admin, parent)';

-- =====================================================
-- 2. PARENT_STUDENT_LINKS TABLE
-- =====================================================
-- Stores parent-student connections via invite codes

CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  code_expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  student_nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active links between same parent-student pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_student_active_link
  ON public.parent_student_links(parent_id, student_id)
  WHERE status = 'active';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_psl_invite_code ON public.parent_student_links(invite_code);
CREATE INDEX IF NOT EXISTS idx_psl_parent_id ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student_id ON public.parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_psl_status ON public.parent_student_links(status);

-- Comments
COMMENT ON TABLE public.parent_student_links IS '부모-자녀 연결 정보';
COMMENT ON COLUMN public.parent_student_links.invite_code IS '8자리 초대 코드';
COMMENT ON COLUMN public.parent_student_links.status IS '연결 상태 (pending, active, revoked)';
COMMENT ON COLUMN public.parent_student_links.code_expires_at IS '초대 코드 만료 시간';
COMMENT ON COLUMN public.parent_student_links.student_nickname IS '부모가 설정한 자녀 별명';

-- Trigger: Update updated_at
CREATE TRIGGER update_parent_student_links_updated_at
  BEFORE UPDATE ON public.parent_student_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. ATTENDANCE TABLE
-- =====================================================
-- Stores student attendance records

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  check_in_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate attendance for same student/course/date
  UNIQUE(student_id, course_id, session_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course ON public.attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_course ON public.attendance(student_id, course_id);

-- Comments
COMMENT ON TABLE public.attendance IS '출석 기록';
COMMENT ON COLUMN public.attendance.week_number IS '수업 주차 (1-10)';
COMMENT ON COLUMN public.attendance.status IS '출석 상태 (present, absent, late, excused)';

-- Trigger: Update updated_at
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. COURSE_PROGRESS TABLE
-- =====================================================
-- Tracks student progress in each course

CREATE TABLE IF NOT EXISTS public.course_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE UNIQUE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  current_week INTEGER NOT NULL DEFAULT 1 CHECK (current_week BETWEEN 1 AND 10),
  completed_weeks INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  total_materials INTEGER DEFAULT 0,
  completed_materials INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  last_activity_at TIMESTAMPTZ,
  total_study_hours DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One progress record per enrollment
  UNIQUE(student_id, course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_progress_student ON public.course_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_course ON public.course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_enrollment ON public.course_progress(enrollment_id);

-- Comments
COMMENT ON TABLE public.course_progress IS '학습 진도 정보';
COMMENT ON COLUMN public.course_progress.completed_weeks IS '완료한 주차 목록';
COMMENT ON COLUMN public.course_progress.completion_percentage IS '전체 완료율 (0-100%)';

-- Trigger: Update updated_at
CREATE TRIGGER update_course_progress_updated_at
  BEFORE UPDATE ON public.course_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. CCTV_SESSIONS TABLE
-- =====================================================
-- Stores CCTV session status per classroom

CREATE TABLE IF NOT EXISTS public.cctv_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  enabled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_cctv_classroom ON public.cctv_sessions(classroom_id);

-- Comments
COMMENT ON TABLE public.cctv_sessions IS 'CCTV 세션 정보';
COMMENT ON COLUMN public.cctv_sessions.classroom_id IS '교실 ID (예: room:door1_enter)';
COMMENT ON COLUMN public.cctv_sessions.is_enabled IS 'CCTV 활성화 여부';

-- Trigger: Update updated_at
CREATE TRIGGER update_cctv_sessions_updated_at
  BEFORE UPDATE ON public.cctv_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. CCTV_VIEW_LOGS TABLE (Optional - for auditing)
-- =====================================================
-- Logs parent CCTV viewing sessions

CREATE TABLE IF NOT EXISTS public.cctv_view_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classroom_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  view_type TEXT DEFAULT 'cctv' CHECK (view_type IN ('cctv', 'screen_share'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cctv_logs_parent ON public.cctv_view_logs(parent_id);
CREATE INDEX IF NOT EXISTS idx_cctv_logs_student ON public.cctv_view_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_cctv_logs_started ON public.cctv_view_logs(started_at);

-- Comments
COMMENT ON TABLE public.cctv_view_logs IS 'CCTV 시청 로그 (감사용)';

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function: Generate 8-character invite code
-- Excludes confusing characters: 0, O, I, 1
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
  attempts INTEGER := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;

    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.parent_student_links WHERE invite_code = code) THEN
      RETURN code;
    END IF;

    attempts := attempts + 1;
    EXIT WHEN attempts > 100;
  END LOOP;

  -- Fallback to UUID-based code
  RETURN UPPER(REPLACE(LEFT(uuid_generate_v4()::TEXT, 8), '-', ''));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_invite_code() IS '부모 초대용 8자리 고유 코드 생성';

-- Function: Calculate attendance rate for a student in a course
CREATE OR REPLACE FUNCTION get_attendance_rate(p_student_id UUID, p_course_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_sessions INTEGER;
  attended_sessions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_sessions
  FROM public.attendance
  WHERE student_id = p_student_id AND course_id = p_course_id;

  IF total_sessions = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO attended_sessions
  FROM public.attendance
  WHERE student_id = p_student_id
    AND course_id = p_course_id
    AND status IN ('present', 'late');

  RETURN ROUND((attended_sessions::DECIMAL / total_sessions::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_attendance_rate(UUID, UUID) IS '학생의 특정 강의 출석률 계산';

-- Function: Create course_progress when enrollment becomes active
CREATE OR REPLACE FUNCTION create_course_progress_on_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.course_progress (enrollment_id, student_id, course_id)
    VALUES (NEW.id, NEW.student_id, NEW.course_id)
    ON CONFLICT (enrollment_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-create course_progress on enrollment
CREATE TRIGGER create_progress_on_enrollment_trigger
  AFTER INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION create_course_progress_on_enrollment();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_view_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS: parent_student_links
-- =====================================================

-- Students can view their own links
CREATE POLICY "Students can view their own links"
  ON public.parent_student_links FOR SELECT
  USING (student_id = auth.uid());

-- Students can create invite codes
CREATE POLICY "Students can create invite codes"
  ON public.parent_student_links FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Students can update/revoke their own links
CREATE POLICY "Students can update their own links"
  ON public.parent_student_links FOR UPDATE
  USING (student_id = auth.uid());

-- Parents can view their own links
CREATE POLICY "Parents can view their own links"
  ON public.parent_student_links FOR SELECT
  USING (parent_id = auth.uid());

-- Parents can update their own links (nickname, etc.)
CREATE POLICY "Parents can update their own links"
  ON public.parent_student_links FOR UPDATE
  USING (parent_id = auth.uid());

-- Service role can do everything (for registration)
CREATE POLICY "Service role full access"
  ON public.parent_student_links FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- RLS: attendance
-- =====================================================

-- Students can view their own attendance
CREATE POLICY "Students can view their own attendance"
  ON public.attendance FOR SELECT
  USING (student_id = auth.uid());

-- Instructors can manage attendance for their courses
CREATE POLICY "Instructors can manage attendance for their courses"
  ON public.attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

-- Parents can view their children's attendance
CREATE POLICY "Parents can view children attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.parent_id = auth.uid()
        AND psl.student_id = attendance.student_id
        AND psl.status = 'active'
    )
  );

-- Admins can manage all attendance
CREATE POLICY "Admins can manage all attendance"
  ON public.attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- =====================================================
-- RLS: course_progress
-- =====================================================

-- Students can view and update their own progress
CREATE POLICY "Students can view their own progress"
  ON public.course_progress FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can update their own progress"
  ON public.course_progress FOR UPDATE
  USING (student_id = auth.uid());

-- Instructors can view progress for their courses
CREATE POLICY "Instructors can view progress for their courses"
  ON public.course_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.instructor_id = auth.uid()
    )
  );

-- Parents can view their children's progress
CREATE POLICY "Parents can view children progress"
  ON public.course_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.parent_id = auth.uid()
        AND psl.student_id = course_progress.student_id
        AND psl.status = 'active'
    )
  );

-- Admins can view all progress
CREATE POLICY "Admins can view all progress"
  ON public.course_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- =====================================================
-- RLS: cctv_sessions
-- =====================================================

-- Instructors can manage CCTV for their courses' classrooms
CREATE POLICY "Instructors can manage CCTV"
  ON public.cctv_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.instructor_id = auth.uid()
    )
  );

-- Parents can view CCTV status if child is in classroom
CREATE POLICY "Parents can view CCTV status"
  ON public.cctv_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.parent_id = auth.uid()
        AND psl.status = 'active'
    )
  );

-- =====================================================
-- RLS: cctv_view_logs
-- =====================================================

-- Parents can view their own logs
CREATE POLICY "Parents can view their own logs"
  ON public.cctv_view_logs FOR SELECT
  USING (parent_id = auth.uid());

-- Service role can insert logs
CREATE POLICY "Service role can insert logs"
  ON public.cctv_view_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- ADDITIONAL RLS: Allow parents to view children's enrollments
-- =====================================================

-- Parents can view their children's enrollments
CREATE POLICY "Parents can view children enrollments"
  ON public.enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.parent_id = auth.uid()
        AND psl.student_id = enrollments.student_id
        AND psl.status = 'active'
    )
  );

-- =====================================================
-- END OF MIGRATION
-- =====================================================
