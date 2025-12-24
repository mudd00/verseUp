-- =====================================================
-- INITIAL DATA
-- =====================================================
-- Purpose: Seed initial data for development and testing
-- Contents:
--   - Classrooms (A-E, 20 capacity each)
--   - Time Slots (Mon-Fri, 5 time slots per day: 09:00-18:40)
-- =====================================================

-- =====================================================
-- NOTE: INITIAL DATA LOCATION
-- =====================================================
-- Initial data for classrooms and time slots is already included in:
-- 003_classrooms_and_schedules.sql (Section 6. INITIAL DATA)
--
-- This file is kept as a placeholder for future initial data that may be needed
-- for other tables such as:
--   - Default notification templates
--   - System-wide settings
--   - Default course categories
--   - Sample course data (for demo purposes)
-- =====================================================

-- =====================================================
-- FUTURE: Additional Initial Data Can Be Added Here
-- =====================================================

-- Example: Default notification templates (if needed)
-- INSERT INTO public.notification_templates (type, title, body) VALUES
--   ('enrollment_confirmed', '수강 신청 완료', '{{course_title}} 수강 신청이 완료되었습니다.'),
--   ('assignment_new', '새 과제 등록', '{{course_title}}에 새로운 과제가 등록되었습니다.')
-- ON CONFLICT DO NOTHING;

-- Example: Sample course categories (if needed)
-- INSERT INTO public.course_categories (name, description) VALUES
--   ('프로그래밍', '프로그래밍 관련 강의'),
--   ('디자인', '디자인 관련 강의'),
--   ('비즈니스', '비즈니스 관련 강의')
-- ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES (For Development)
-- =====================================================

-- Verify classrooms were created
-- SELECT * FROM public.classrooms ORDER BY name;

-- Verify time slots were created
-- SELECT
--   CASE day_of_week
--     WHEN 1 THEN '월요일'
--     WHEN 2 THEN '화요일'
--     WHEN 3 THEN '수요일'
--     WHEN 4 THEN '목요일'
--     WHEN 5 THEN '금요일'
--   END as 요일,
--   start_time as 시작시간,
--   end_time as 종료시간
-- FROM public.time_slots
-- ORDER BY day_of_week, start_time;

-- Count time slots (should be 25: 5 days × 5 slots)
-- SELECT COUNT(*) as total_time_slots FROM public.time_slots;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.classrooms IS '가상 강의실 (A-E, 각 20명 수용) - 초기 데이터는 003_classrooms_and_schedules.sql에서 생성됨';
COMMENT ON TABLE public.time_slots IS '주중 시간대 (월-금, 09:00-18:40, 5개 타임슬롯) - 초기 데이터는 003_classrooms_and_schedules.sql에서 생성됨';
