-- =====================================================
-- 프로덕션용 Storage RLS 정책
-- =====================================================
-- 주의: 프로덕션 배포 시에만 사용하세요!

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Authenticated users can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own course materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own course materials" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course materials" ON storage.objects;

-- =====================================================
-- 프로덕션용 엄격한 정책
-- =====================================================

-- 정책 1: 강사만 자신의 강의 폴더에 업로드 가능
CREATE POLICY "Instructors can upload course materials"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials' AND
    -- 폴더명이 자신이 강의하는 course_id와 일치하는지 확인
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- 정책 2: 강사만 자신의 강의 자료 업데이트 가능
CREATE POLICY "Instructors can update course materials"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-materials' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- 정책 3: 강사만 자신의 강의 자료 삭제 가능
CREATE POLICY "Instructors can delete course materials"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-materials' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

-- 정책 4: 모든 사용자가 파일 조회 가능 (public bucket)
CREATE POLICY "Anyone can view course materials"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'course-materials');
