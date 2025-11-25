-- VerseUp Row Level Security (RLS) Policies
-- This migration sets up security policies for all tables

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but needed for manual inserts)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- COURSES POLICIES
-- =====================================================

-- Anyone can view courses
CREATE POLICY "Courses are viewable by everyone"
  ON public.courses
  FOR SELECT
  USING (true);

-- Only instructors and admins can create courses
CREATE POLICY "Instructors and admins can create courses"
  ON public.courses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('instructor', 'admin')
    )
  );

-- Instructors can update their own courses, admins can update any course
CREATE POLICY "Instructors can update own courses"
  ON public.courses
  FOR UPDATE
  USING (
    instructor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Instructors can delete their own courses, admins can delete any course
CREATE POLICY "Instructors can delete own courses"
  ON public.courses
  FOR DELETE
  USING (
    instructor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- ENROLLMENTS POLICIES
-- =====================================================

-- Users can view their own enrollments, instructors can view enrollments for their courses
CREATE POLICY "Users can view own enrollments and instructors can view course enrollments"
  ON public.enrollments
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND courses.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Students can enroll themselves
CREATE POLICY "Students can enroll in courses"
  ON public.enrollments
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'student'
    )
  );

-- Users can update their own enrollments (e.g., to drop a course)
CREATE POLICY "Users can update own enrollments"
  ON public.enrollments
  FOR UPDATE
  USING (student_id = auth.uid());

-- Users can delete their own enrollments
CREATE POLICY "Users can delete own enrollments"
  ON public.enrollments
  FOR DELETE
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- LIVE SESSIONS POLICIES
-- =====================================================

-- Anyone can view live sessions
CREATE POLICY "Live sessions are viewable by everyone"
  ON public.live_sessions
  FOR SELECT
  USING (true);

-- Instructors can create sessions for their courses
CREATE POLICY "Instructors can create sessions for their courses"
  ON public.live_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_id
      AND courses.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Instructors can update sessions for their courses
CREATE POLICY "Instructors can update own course sessions"
  ON public.live_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_id
      AND courses.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Instructors can delete sessions for their courses
CREATE POLICY "Instructors can delete own course sessions"
  ON public.live_sessions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_id
      AND courses.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- CHAT MESSAGES POLICIES
-- =====================================================

-- Users can view chat messages from sessions they're enrolled in or teaching
CREATE POLICY "Users can view chat messages from their sessions"
  ON public.chat_messages
  FOR SELECT
  USING (
    -- Message author can see their own messages
    user_id = auth.uid()
    -- Students enrolled in the course can see messages
    OR EXISTS (
      SELECT 1 FROM public.enrollments
      JOIN public.live_sessions ON live_sessions.course_id = enrollments.course_id
      WHERE enrollments.student_id = auth.uid()
      AND live_sessions.id = chat_messages.session_id
    )
    -- Course instructor can see messages
    OR EXISTS (
      SELECT 1 FROM public.courses
      JOIN public.live_sessions ON live_sessions.course_id = courses.id
      WHERE courses.instructor_id = auth.uid()
      AND live_sessions.id = chat_messages.session_id
    )
    -- Admins can see all messages
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Authenticated users can send chat messages
CREATE POLICY "Authenticated users can send chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
  );

-- Users can delete their own messages, admins can delete any message
CREATE POLICY "Users can delete own messages"
  ON public.chat_messages
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
