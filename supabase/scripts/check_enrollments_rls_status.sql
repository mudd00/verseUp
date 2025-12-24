-- enrollments 테이블의 RLS 상태 확인

-- 1. RLS 활성화 여부 확인
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS 활성화"
FROM pg_tables
WHERE tablename = 'enrollments';

-- 2. 현재 적용된 정책 확인
SELECT
  schemaname,
  tablename,
  policyname as "정책명",
  permissive,
  roles,
  cmd as "명령",
  qual as "USING 조건",
  with_check as "WITH CHECK 조건"
FROM pg_policies
WHERE tablename = 'enrollments'
ORDER BY policyname;
