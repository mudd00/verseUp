-- VerseUp: RLS 정책 개선 - user_metadata도 체크
-- profiles 테이블뿐만 아니라 auth.users의 user_metadata도 체크하도록 정책 수정

-- 기존 courses INSERT 정책 삭제 및 재생성
DROP POLICY IF EXISTS "Instructors and admins can create courses" ON public.courses;

-- 새로운 정책: profiles 또는 user_metadata에서 role 확인
CREATE POLICY "Instructors and admins can create courses"
  ON public.courses
  FOR INSERT
  WITH CHECK (
    -- profiles 테이블에서 role 확인
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('instructor', 'admin')
    )
    -- 또는 user_metadata에서 role 확인
    OR (
      auth.jwt() ->> 'user_metadata' IS NOT NULL
      AND (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('instructor', 'admin')
      )
    )
    -- 또는 email 패턴으로 확인 (fallback)
    OR (
      auth.jwt() ->> 'email' LIKE 'instructor@%'
      OR auth.jwt() ->> 'email' LIKE 'admin@%'
    )
  );

-- 기존 courses UPDATE 정책도 업데이트
DROP POLICY IF EXISTS "Instructors can update own courses" ON public.courses;

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
    OR (
      auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    )
    OR (
      auth.jwt() ->> 'email' LIKE 'admin@%'
    )
  );

-- 기존 courses DELETE 정책도 업데이트
DROP POLICY IF EXISTS "Instructors can delete own courses" ON public.courses;

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
    OR (
      auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    )
    OR (
      auth.jwt() ->> 'email' LIKE 'admin@%'
    )
  );
