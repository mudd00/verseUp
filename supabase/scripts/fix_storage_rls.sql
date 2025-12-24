-- =====================================================
-- Storage RLS 정책 수정 스크립트
-- =====================================================
-- 목적: course-materials 버킷의 RLS 정책을 올바르게 설정

-- =====================================================
-- 1. 기존 Storage 정책 삭제
-- =====================================================
DROP POLICY IF EXISTS "Instructors can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course materials" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload course materials" ON storage.objects;

-- =====================================================
-- 2. Storage 버킷 확인 및 생성
-- =====================================================
-- course-materials 버킷이 없으면 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials',
  true,  -- public bucket
  52428800, -- 50MB
  NULL  -- 모든 파일 타입 허용 (개발용)
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 3. 새로운 Storage RLS 정책 생성
-- =====================================================

-- 정책 1: 인증된 사용자는 업로드 가능 (개발용 - 간단한 정책)
CREATE POLICY "Authenticated users can upload course materials"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials'
  );

-- 정책 2: 인증된 사용자는 자신이 업로드한 파일 업데이트 가능
CREATE POLICY "Users can update own course materials"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'course-materials' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'course-materials' AND owner = auth.uid());

-- 정책 3: 인증된 사용자는 자신이 업로드한 파일 삭제 가능
CREATE POLICY "Users can delete own course materials"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'course-materials' AND owner = auth.uid());

-- 정책 4: 모든 사용자가 파일 조회 가능 (public bucket)
CREATE POLICY "Anyone can view course materials"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'course-materials');

-- =====================================================
-- 4. 검증
-- =====================================================
-- Storage 버킷 확인
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'course-materials';

-- Storage 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%course materials%'
ORDER BY policyname;
