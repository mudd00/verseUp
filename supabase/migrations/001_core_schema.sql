-- =====================================================
-- VERSEUP CORE SCHEMA
-- =====================================================
-- Purpose: Creates core database schema for VerseUp platform
-- Contents:
--   1. UUID Extension
--   2. Profiles table (user management)
--   3. Payments table (payment processing)
--   4. Courses table (course management with scheduling)
--   5. Enrollments table (course enrollment tracking)
--   6. Core functions and triggers
-- =====================================================

-- =====================================================
-- 1. ENABLE EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. PROFILES TABLE
-- =====================================================
-- Stores additional user information beyond auth.users
-- Automatically created via trigger on auth.users insert

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Comments
COMMENT ON TABLE public.profiles IS '사용자 프로필 정보';
COMMENT ON COLUMN public.profiles.role IS '사용자 역할 (student, instructor, admin)';

-- =====================================================
-- 3. PAYMENTS TABLE
-- =====================================================
-- Stores payment transaction records for course enrollments

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL UNIQUE,
  payment_key TEXT NOT NULL,
  course_id UUID, -- Foreign key added after courses table creation
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  method TEXT,
  order_name TEXT,
  approved_at TIMESTAMPTZ,
  receipt_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_course ON public.payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Comments
COMMENT ON TABLE public.payments IS '결제 정보 (토스페이먼츠 연동)';
COMMENT ON COLUMN public.payments.order_id IS '토스페이먼츠 주문 ID';
COMMENT ON COLUMN public.payments.payment_key IS '토스페이먼츠 결제 키';
COMMENT ON COLUMN public.payments.amount IS '결제 금액 (원 단위)';

-- =====================================================
-- 4. COURSES TABLE
-- =====================================================
-- Stores course information with scheduling references

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thumbnail_url TEXT,
  code TEXT UNIQUE,
  category TEXT DEFAULT 'general',
  level TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  price INTEGER DEFAULT 0 CHECK (price >= 0),
  weeks INTEGER DEFAULT 8 CHECK (weeks BETWEEN 1 AND 10),
  max_students INTEGER DEFAULT 20 CHECK (max_students > 0),
  enrolled_count INTEGER DEFAULT 0 CHECK (enrolled_count >= 0),
  classroom_id UUID, -- References classrooms table (created in migration 003)
  time_slot_id UUID, -- References time_slots table (created in migration 003)
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_enrolled_count CHECK (enrolled_count <= max_students)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_start_date ON public.courses(start_date);

-- Comments
COMMENT ON TABLE public.courses IS '강의 정보';
COMMENT ON COLUMN public.courses.code IS '고유 수강번호 (예: CS101, MATH201)';
COMMENT ON COLUMN public.courses.weeks IS '강의 진행 주차 수 (1-10주)';
COMMENT ON COLUMN public.courses.enrolled_count IS '현재 수강 인원 (자동 계산)';

-- =====================================================
-- 5. ENROLLMENTS TABLE
-- =====================================================
-- Tracks student course enrollments

CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate enrollments
  UNIQUE(course_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_payment ON public.enrollments(payment_id);

-- Comments
COMMENT ON TABLE public.enrollments IS '수강 신청 정보';
COMMENT ON COLUMN public.enrollments.status IS '수강 상태 (active, dropped, completed)';

-- Add foreign key from payments to courses
ALTER TABLE public.payments
ADD CONSTRAINT fk_payments_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;

-- =====================================================
-- 6. CORE FUNCTIONS
-- =====================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate unique course code
CREATE OR REPLACE FUNCTION generate_course_code(course_title TEXT)
RETURNS TEXT AS $$
DECLARE
  code_prefix TEXT;
  random_suffix TEXT;
  new_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Extract first 3 characters, uppercase, remove special chars
  code_prefix := UPPER(REGEXP_REPLACE(LEFT(course_title, 3), '[^A-Z0-9]', '', 'g'));

  -- Pad with 'X' if too short
  WHILE LENGTH(code_prefix) < 3 LOOP
    code_prefix := code_prefix || 'X';
  END LOOP;

  -- Generate random 3-digit suffix
  LOOP
    random_suffix := LPAD((FLOOR(RANDOM() * 1000))::TEXT, 3, '0');
    new_code := code_prefix || random_suffix;

    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE code = new_code) THEN
      RETURN new_code;
    END IF;

    -- Prevent infinite loop
    counter := counter + 1;
    EXIT WHEN counter > 100;
  END LOOP;

  -- Fallback to UUID-based code
  RETURN UPPER(LEFT(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 6));
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-generate course code on insert
CREATE OR REPLACE FUNCTION auto_generate_course_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_course_code(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Unified enrolled_count management
-- Handles INSERT, UPDATE, and DELETE operations on enrollments
-- This prevents duplicate count issues when status changes (e.g., dropped → active)
CREATE OR REPLACE FUNCTION manage_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT: active 상태로 등록
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE public.courses
      SET enrolled_count = enrolled_count + 1
      WHERE id = NEW.course_id;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: 상태 변경
  IF TG_OP = 'UPDATE' THEN
    -- active → dropped (수강 취소)
    IF OLD.status = 'active' AND NEW.status = 'dropped' THEN
      UPDATE public.courses
      SET enrolled_count = GREATEST(0, enrolled_count - 1)
      WHERE id = OLD.course_id;

    -- dropped → active (재수강)
    ELSIF OLD.status = 'dropped' AND NEW.status = 'active' THEN
      UPDATE public.courses
      SET enrolled_count = enrolled_count + 1
      WHERE id = NEW.course_id;

    -- completed → active (재수강)
    ELSIF OLD.status = 'completed' AND NEW.status = 'active' THEN
      UPDATE public.courses
      SET enrolled_count = enrolled_count + 1
      WHERE id = NEW.course_id;

    -- active → completed (수료)
    ELSIF OLD.status = 'active' AND NEW.status = 'completed' THEN
      UPDATE public.courses
      SET enrolled_count = GREATEST(0, enrolled_count - 1)
      WHERE id = OLD.course_id;
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE: active 상태 삭제
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE public.courses
      SET enrolled_count = GREATEST(0, enrolled_count - 1)
      WHERE id = OLD.course_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger: Update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on courses
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Update updated_at on enrollments
CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger: Auto-generate course code
CREATE TRIGGER auto_generate_course_code_trigger
  BEFORE INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_course_code();

-- Trigger: Unified enrolled_count management
-- Handles INSERT, UPDATE (status changes), and DELETE operations
CREATE TRIGGER manage_enrolled_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION manage_enrolled_count();
