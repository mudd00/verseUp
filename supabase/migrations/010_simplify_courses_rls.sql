-- VerseUp: Courses RLS 정책 간소화
-- 개발 단계에서는 인증된 모든 사용자가 강의를 생성할 수 있도록 허용
-- 프로덕션에서는 더 엄격한 정책으로 변경해야 함

-- 기존 courses INSERT 정책 삭제
DROP POLICY IF EXISTS "Instructors and admins can create courses" ON public.courses;

-- 새로운 정책: 인증된 사용자는 모두 강의 생성 가능 (개발용)
-- TODO: 프로덕션에서는 profiles.role을 엄격히 체크하도록 수정 필요
CREATE POLICY "Authenticated users can create courses"
  ON public.courses
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE와 DELETE는 자신의 강의만 가능하도록 유지
DROP POLICY IF EXISTS "Instructors can update own courses" ON public.courses;

CREATE POLICY "Users can update own courses"
  ON public.courses
  FOR UPDATE
  USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can delete own courses" ON public.courses;

CREATE POLICY "Users can delete own courses"
  ON public.courses
  FOR DELETE
  USING (instructor_id = auth.uid());
