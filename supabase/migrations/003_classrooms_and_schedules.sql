-- =====================================================
-- CLASSROOMS AND SCHEDULES SCHEMA
-- =====================================================
-- Purpose: Creates classroom-based course scheduling system
-- Contents:
--   1. Classrooms table (virtual classroom management)
--   2. Time Slots table (predefined time slots for scheduling)
--   3. Course Schedules table (weekly session schedules)
--   4. Foreign key updates to courses table
--   5. Schedule generation functions
--   6. Initial data (5 classrooms with Mon-Fri time slots)
-- =====================================================

-- =====================================================
-- 1. CLASSROOMS TABLE
-- =====================================================
-- Stores virtual classroom information for the metaverse

CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  capacity INTEGER DEFAULT 30 CHECK (capacity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classrooms_name ON public.classrooms(name);

-- Comments
COMMENT ON TABLE public.classrooms IS '가상 강의실 정보';
COMMENT ON COLUMN public.classrooms.capacity IS '강의실 최대 수용 인원';

-- =====================================================
-- 2. TIME SLOTS TABLE
-- =====================================================
-- Stores available time slots (Mon-Fri, 9:00-18:40)
-- 5 slots per day: 09:00-10:40, 11:00-12:40, 13:00-14:40, 15:00-16:40, 17:00-18:40

CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  UNIQUE(day_of_week, start_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_slots_day ON public.time_slots(day_of_week);

-- Comments
COMMENT ON TABLE public.time_slots IS '강의 시간대 정보';
COMMENT ON COLUMN public.time_slots.day_of_week IS '요일 (0=일요일, 1=월요일, ..., 6=토요일)';

-- =====================================================
-- 3. COURSE SCHEDULES TABLE
-- =====================================================
-- Stores individual session schedules for each course

CREATE TABLE IF NOT EXISTS public.course_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES public.classrooms(id),
  time_slot_id UUID REFERENCES public.time_slots(id),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent double-booking of classroom at same time slot
  UNIQUE(classroom_id, time_slot_id, start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_schedules_course ON public.course_schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_classroom_time ON public.course_schedules(classroom_id, time_slot_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_start_date ON public.course_schedules(start_date);

-- Comments
COMMENT ON TABLE public.course_schedules IS '강의 스케줄 정보';
COMMENT ON COLUMN public.course_schedules.start_date IS '스케줄 시작일';
COMMENT ON COLUMN public.course_schedules.end_date IS '스케줄 종료일 (nullable)';

-- =====================================================
-- 4. UPDATE COURSES TABLE
-- =====================================================
-- Add foreign key constraints to courses table

ALTER TABLE public.courses
ADD CONSTRAINT fk_courses_classroom FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE SET NULL;

ALTER TABLE public.courses
ADD CONSTRAINT fk_courses_time_slot FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id) ON DELETE SET NULL;

-- Create indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_courses_classroom ON public.courses(classroom_id);
CREATE INDEX IF NOT EXISTS idx_courses_time_slot ON public.courses(time_slot_id);

-- =====================================================
-- 5. SCHEDULE MANAGEMENT FUNCTIONS
-- =====================================================

-- Function: Check time slot availability before scheduling
CREATE OR REPLACE FUNCTION check_time_slot_availability(
  p_classroom_id UUID,
  p_time_slot_id UUID,
  p_start_date DATE,
  p_weeks INTEGER,
  p_course_id UUID DEFAULT NULL
)
RETURNS TABLE(
  is_available BOOLEAN,
  conflicting_course_id UUID,
  conflicting_course_title TEXT,
  conflict_date DATE
) AS $$
DECLARE
  v_time_slot RECORD;
  v_session_date DATE;
  v_week INTEGER;
  v_conflict RECORD;
BEGIN
  -- Get time slot details
  SELECT ts.day_of_week, ts.start_time, ts.end_time
  INTO v_time_slot
  FROM public.time_slots ts
  WHERE ts.id = p_time_slot_id;

  -- Calculate first session date based on day_of_week
  v_session_date := p_start_date;

  -- Adjust to next occurrence of the target day_of_week
  WHILE EXTRACT(DOW FROM v_session_date)::INTEGER != v_time_slot.day_of_week LOOP
    v_session_date := v_session_date + 1;
  END LOOP;

  -- Check each week for conflicts
  FOR v_week IN 1..p_weeks LOOP
    -- Check if there's already a course scheduled at this time
    SELECT c.id, c.title, cs.start_date
    INTO v_conflict
    FROM public.course_schedules cs
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cs.classroom_id = p_classroom_id
      AND cs.time_slot_id = p_time_slot_id
      AND cs.start_date = v_session_date
      AND (p_course_id IS NULL OR c.id != p_course_id);

    -- If conflict found, return immediately
    IF FOUND THEN
      RETURN QUERY SELECT false, v_conflict.id, v_conflict.title, v_conflict.start_date;
      RETURN;
    END IF;

    -- Move to next week (same day of week)
    v_session_date := v_session_date + 7;
  END LOOP;

  -- No conflicts found
  RETURN QUERY SELECT true, NULL::UUID, NULL::TEXT, NULL::DATE;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION check_time_slot_availability IS '강의실 및 시간대 중복 확인 함수';

-- =====================================================
-- 6. INITIAL DATA
-- =====================================================

-- Create 5 default classrooms
INSERT INTO public.classrooms (name, capacity) VALUES
  ('강의실 A', 20),
  ('강의실 B', 20),
  ('강의실 C', 20),
  ('강의실 D', 20),
  ('강의실 E', 20)
ON CONFLICT (name) DO NOTHING;

-- Create time slots (Mon-Fri, 5 slots per day)
-- day_of_week: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
DO $$
DECLARE
  v_day INTEGER;
  v_slots TIME[][] := ARRAY[
    [TIME '09:00:00', TIME '10:40:00'],
    [TIME '11:00:00', TIME '12:40:00'],
    [TIME '13:00:00', TIME '14:40:00'],
    [TIME '15:00:00', TIME '16:40:00'],
    [TIME '17:00:00', TIME '18:40:00']
  ];
  v_slot_idx INTEGER;
BEGIN
  -- Monday to Friday (1-5)
  FOR v_day IN 1..5 LOOP
    FOR v_slot_idx IN 1..5 LOOP
      INSERT INTO public.time_slots (
        day_of_week,
        start_time,
        end_time
      ) VALUES (
        v_day,
        v_slots[v_slot_idx][1],
        v_slots[v_slot_idx][2]
      )
      ON CONFLICT (day_of_week, start_time) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Comments on initial data
COMMENT ON TABLE public.classrooms IS '가상 강의실 (A-E, 각 20명 수용)';
COMMENT ON TABLE public.time_slots IS '주중 시간대 (월-금, 09:00-18:40, 5개 타임슬롯)';
