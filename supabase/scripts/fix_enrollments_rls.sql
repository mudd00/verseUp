-- enrollments 테이블 RLS 정책 설정
-- 프론트엔드에서 직접 Supabase를 호출할 때 필요

-- RLS 활성화 확인
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Students can view their own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view their course enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON enrollments;

-- 1. 학생은 자신의 수강 신청만 조회 가능
CREATE POLICY "Students can view their own enrollments"
ON enrollments
FOR SELECT
USING (
  auth.uid() = student_id
);

-- 2. 강사는 자신의 강의 수강생 조회 가능
CREATE POLICY "Instructors can view their course enrollments"
ON enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = enrollments.course_id
    AND courses.instructor_id = auth.uid()
  )
);

-- 3. 관리자는 모든 수강 신청 조회 가능
CREATE POLICY "Admins can view all enrollments"
ON enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' = 'admin')
  )
);

-- 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'enrollments'
ORDER BY policyname;
