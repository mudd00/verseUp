-- =====================================================
-- COURSE SCHEDULE SYSTEM
-- =====================================================
-- This migration creates tables for classroom-based course scheduling
-- with predefined time slots (Mon-Fri, 9:00-19:00)

-- =====================================================
-- CLASSROOMS TABLE
-- =====================================================
-- Stores virtual classroom information
CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_capacity CHECK (capacity > 0)
);

-- Create index
CREATE INDEX IF NOT EXISTS classrooms_status_idx ON public.classrooms(status);

-- =====================================================
-- TIME SLOTS TABLE
-- =====================================================
-- Stores available time slots for each classroom
-- Time slots: 09:00-10:40, 11:00-12:40, 13:00-14:40, 15:00-16:40, 17:00-18:40
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Monday, 5=Friday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_order INTEGER NOT NULL CHECK (slot_order BETWEEN 1 AND 5), -- 1-5 for 5 daily slots
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  -- Ensure unique time slot per classroom per day
  UNIQUE(classroom_id, day_of_week, slot_order)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS time_slots_classroom_id_idx ON public.time_slots(classroom_id);
CREATE INDEX IF NOT EXISTS time_slots_day_of_week_idx ON public.time_slots(day_of_week);
CREATE INDEX IF NOT EXISTS time_slots_is_active_idx ON public.time_slots(is_active);

-- =====================================================
-- UPDATE COURSES TABLE
-- =====================================================
-- Add classroom and time slot references to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS weeks INTEGER NOT NULL DEFAULT 1 CHECK (weeks > 0),
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));

-- Create indexes
CREATE INDEX IF NOT EXISTS courses_classroom_id_idx ON public.courses(classroom_id);
CREATE INDEX IF NOT EXISTS courses_time_slot_id_idx ON public.courses(time_slot_id);
CREATE INDEX IF NOT EXISTS courses_status_idx ON public.courses(status);

-- Add comment
COMMENT ON COLUMN public.courses.weeks IS 'Number of weeks the course will run';
COMMENT ON COLUMN public.courses.price IS 'Course price (0.00 for free courses)';

-- =====================================================
-- COURSE SCHEDULES TABLE
-- =====================================================
-- Stores individual session schedules for each course
-- Automatically generated based on course weeks, day_of_week, and time_slot
CREATE TABLE IF NOT EXISTS public.course_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number > 0),
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_time_range_schedule CHECK (end_time > start_time),
  -- Ensure unique session per course per week
  UNIQUE(course_id, week_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS course_schedules_course_id_idx ON public.course_schedules(course_id);
CREATE INDEX IF NOT EXISTS course_schedules_session_date_idx ON public.course_schedules(session_date);
CREATE INDEX IF NOT EXISTS course_schedules_status_idx ON public.course_schedules(status);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate course schedules when a course is created
CREATE OR REPLACE FUNCTION generate_course_schedules()
RETURNS TRIGGER AS $$
DECLARE
  v_time_slot RECORD;
  v_week INTEGER;
  v_session_date DATE;
  v_start_date DATE;
BEGIN
  -- Only generate schedules if classroom_id and time_slot_id are set
  IF NEW.classroom_id IS NULL OR NEW.time_slot_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get time slot details
  SELECT ts.day_of_week, ts.start_time, ts.end_time
  INTO v_time_slot
  FROM public.time_slots ts
  WHERE ts.id = NEW.time_slot_id;

  -- Calculate first session date (next occurrence of the day_of_week from start_date)
  v_start_date := NEW.start_date::DATE;

  -- Calculate the first session date
  -- day_of_week: 1=Monday, 2=Tuesday, ..., 5=Friday
  -- EXTRACT(DOW FROM date): 0=Sunday, 1=Monday, ..., 6=Saturday
  v_session_date := v_start_date +
    ((v_time_slot.day_of_week - EXTRACT(DOW FROM v_start_date)::INTEGER + 7) % 7)::INTEGER;

  -- If the calculated date is before start_date, move to next week
  IF v_session_date < v_start_date THEN
    v_session_date := v_session_date + 7;
  END IF;

  -- Generate schedules for each week
  FOR v_week IN 1..NEW.weeks LOOP
    INSERT INTO public.course_schedules (
      course_id,
      week_number,
      session_date,
      start_time,
      end_time,
      status
    ) VALUES (
      NEW.id,
      v_week,
      v_session_date,
      v_time_slot.start_time,
      v_time_slot.end_time,
      'scheduled'
    );

    -- Move to next week
    v_session_date := v_session_date + 7;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check time slot availability before course creation
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

  -- Calculate first session date
  v_session_date := p_start_date +
    ((v_time_slot.day_of_week - EXTRACT(DOW FROM p_start_date)::INTEGER + 7) % 7)::INTEGER;

  IF v_session_date < p_start_date THEN
    v_session_date := v_session_date + 7;
  END IF;

  -- Check each week for conflicts
  FOR v_week IN 1..p_weeks LOOP
    -- Check if there's already a course scheduled at this time
    SELECT c.id, c.title, cs.session_date
    INTO v_conflict
    FROM public.course_schedules cs
    JOIN public.courses c ON c.id = cs.course_id
    WHERE c.classroom_id = p_classroom_id
      AND cs.session_date = v_session_date
      AND cs.start_time = v_time_slot.start_time
      AND cs.status = 'scheduled'
      AND (p_course_id IS NULL OR c.id != p_course_id);

    -- If conflict found, return immediately
    IF FOUND THEN
      RETURN QUERY SELECT false, v_conflict.id, v_conflict.title, v_conflict.session_date;
      RETURN;
    END IF;

    -- Move to next week
    v_session_date := v_session_date + 7;
  END LOOP;

  -- No conflicts found
  RETURN QUERY SELECT true, NULL::UUID, NULL::TEXT, NULL::DATE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at on classrooms
CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON public.classrooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on time_slots
CREATE TRIGGER update_time_slots_updated_at
  BEFORE UPDATE ON public.time_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on course_schedules
CREATE TRIGGER update_course_schedules_updated_at
  BEFORE UPDATE ON public.course_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to generate course schedules when a course is created or updated
CREATE TRIGGER generate_schedules_on_course_insert
  AFTER INSERT ON public.courses
  FOR EACH ROW
  WHEN (NEW.classroom_id IS NOT NULL AND NEW.time_slot_id IS NOT NULL)
  EXECUTE FUNCTION generate_course_schedules();

-- Trigger to regenerate schedules when course time slot changes
CREATE TRIGGER regenerate_schedules_on_course_update
  AFTER UPDATE ON public.courses
  FOR EACH ROW
  WHEN (
    (OLD.classroom_id IS DISTINCT FROM NEW.classroom_id OR
     OLD.time_slot_id IS DISTINCT FROM NEW.time_slot_id OR
     OLD.weeks IS DISTINCT FROM NEW.weeks OR
     OLD.start_date IS DISTINCT FROM NEW.start_date)
    AND NEW.classroom_id IS NOT NULL
    AND NEW.time_slot_id IS NOT NULL
  )
  EXECUTE FUNCTION generate_course_schedules();

-- =====================================================
-- INITIAL DATA: DEFAULT CLASSROOMS
-- =====================================================
INSERT INTO public.classrooms (name, description, capacity) VALUES
  ('강의실 A', '메타버스 강의실 A', 20),
  ('강의실 B', '메타버스 강의실 B', 20),
  ('강의실 C', '메타버스 강의실 C', 20),
  ('강의실 D', '메타버스 강의실 D', 20),
  ('강의실 E', '메타버스 강의실 E', 20)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- INITIAL DATA: DEFAULT TIME SLOTS
-- =====================================================
-- Generate time slots for all classrooms (Mon-Fri, 5 slots per day)
DO $$
DECLARE
  v_classroom RECORD;
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
  FOR v_classroom IN SELECT id FROM public.classrooms LOOP
    FOR v_day IN 1..5 LOOP -- Monday to Friday
      FOR v_slot_idx IN 1..5 LOOP
        INSERT INTO public.time_slots (
          classroom_id,
          day_of_week,
          start_time,
          end_time,
          slot_order,
          is_active
        ) VALUES (
          v_classroom.id,
          v_day,
          v_slots[v_slot_idx][1],
          v_slots[v_slot_idx][2],
          v_slot_idx,
          true
        )
        ON CONFLICT (classroom_id, day_of_week, slot_order) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
