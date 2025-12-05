# Supabase Storage 설정 가이드

강의 자료 업로드 기능을 사용하기 위해 Supabase Storage를 설정해야 합니다.

## 1. Supabase 대시보드 접속

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택

## 2. Storage 버킷 생성

### 2.1 Storage 페이지로 이동
- 좌측 메뉴에서 **Storage** 클릭

### 2.2 새 버킷 생성
1. **New bucket** 버튼 클릭
2. 다음 정보 입력:
   - **Name**: `course-materials`
   - **Public bucket**: ✅ 체크 (학생들이 자료를 다운로드할 수 있도록)
3. **Create bucket** 클릭

## 3. Storage Policies 설정

버킷을 생성한 후, RLS(Row Level Security) 정책을 설정해야 합니다.

### 3.1 Policies 페이지로 이동
1. `course-materials` 버킷 클릭
2. **Policies** 탭 클릭
3. **New Policy** 클릭

### 3.2 정책 생성

Supabase Dashboard의 Policy Editor를 사용하는 경우:

#### 정책 1: 파일 업로드 (강사만)

1. **New Policy** 클릭
2. **"For full customization"** 선택
3. 다음 내용 입력:
   - **Policy name**: `Instructors can upload files`
   - **Allowed operation**: `INSERT` 선택
   - **Target roles**: `authenticated` 선택
   - **WITH CHECK expression**:
   ```sql
   bucket_id = 'course-materials' AND
   (storage.foldername(name))[1] IN (
     SELECT id::text FROM courses WHERE instructor_id = auth.uid()
   )
   ```
4. **Save policy** 클릭

#### 정책 2: 파일 조회 (수강생 + 강사)

1. **New Policy** 클릭
2. **"For full customization"** 선택
3. 다음 내용 입력:
   - **Policy name**: `Users can view course materials`
   - **Allowed operation**: `SELECT` 선택
   - **Target roles**: `authenticated` 선택
   - **USING expression**:
   ```sql
   bucket_id = 'course-materials' AND
   (
     (storage.foldername(name))[1] IN (
       SELECT id::text FROM courses WHERE instructor_id = auth.uid()
     )
     OR
     (storage.foldername(name))[1] IN (
       SELECT course_id::text FROM enrollments
       WHERE student_id = auth.uid() AND status = 'active'
     )
   )
   ```
4. **Save policy** 클릭

#### 정책 3: 파일 삭제 (강사만)

1. **New Policy** 클릭
2. **"For full customization"** 선택
3. 다음 내용 입력:
   - **Policy name**: `Instructors can delete files`
   - **Allowed operation**: `DELETE` 선택
   - **Target roles**: `authenticated` 선택
   - **USING expression**:
   ```sql
   bucket_id = 'course-materials' AND
   (storage.foldername(name))[1] IN (
     SELECT id::text FROM courses WHERE instructor_id = auth.uid()
   )
   ```
4. **Save policy** 클릭

---

### 3.3 SQL Editor로 직접 정책 생성 (대안)

또는 **SQL Editor**를 사용하여 한 번에 모든 정책을 생성할 수 있습니다:

1. 좌측 메뉴에서 **SQL Editor** 클릭
2. **New query** 클릭
3. 다음 SQL 전체를 복사하여 붙여넣기:

```sql
-- 정책 1: 파일 업로드 (강사만)
CREATE POLICY "Instructors can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-materials' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM courses WHERE instructor_id = auth.uid()
  )
);

-- 정책 2: 파일 조회 (수강생 + 강사)
CREATE POLICY "Users can view course materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-materials' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM courses WHERE instructor_id = auth.uid()
    )
    OR
    (storage.foldername(name))[1] IN (
      SELECT course_id::text FROM enrollments
      WHERE student_id = auth.uid() AND status = 'active'
    )
  )
);

-- 정책 3: 파일 삭제 (강사만)
CREATE POLICY "Instructors can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-materials' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM courses WHERE instructor_id = auth.uid()
  )
);
```

4. **RUN** 버튼 클릭

## 4. 데이터베이스 마이그레이션 실행

```bash
# Supabase CLI를 사용하는 경우
supabase db push

# 또는 SQL Editor에서 직접 실행
```

1. Supabase Dashboard → **SQL Editor** 클릭
2. 다음 파일 내용 복사하여 실행:
   - `supabase/migrations/014_course_materials.sql`

## 5. 환경 변수 확인

`.env` 파일에 다음 변수가 설정되어 있는지 확인:

```env
# Frontend (클라이언트에서 Storage 접근)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend (서버에서 Storage 접근)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

## 6. 테스트

### 6.1 강의 수정 페이지 접속
1. 강사 계정으로 로그인
2. Dashboard → 내 강의 → 강의 선택 → **수정** 클릭
3. 페이지 하단에 **자료 업로드** 섹션 확인

### 6.2 파일 업로드 테스트
1. 제목 입력 (예: "1주차 강의자료")
2. 파일 선택 (PDF, PPT, ZIP 등)
3. **업로드** 버튼 클릭
4. 성공 메시지 확인

### 6.3 파일 다운로드 테스트
1. 학생 계정으로 로그인
2. 해당 강의 수강 신청
3. 강의 상세 페이지 → 자료 목록에서 **다운로드** 버튼 클릭

## 7. 스토리지 용량 확인

### 무료 플랜
- **스토리지**: 1GB
- **대역폭**: 2GB/월
- **파일 크기 제한**: 50MB (코드에서 설정)

### 용량 부족 시 해결방법
1. **Pro 플랜 업그레이드** ($25/월)
   - 스토리지: 100GB
   - 대역폭: 200GB/월

2. **외부 스토리지 통합**
   - AWS S3
   - Google Cloud Storage
   - Cloudinary

## 8. 문제 해결

### 업로드 실패: "Failed to upload file"
- Storage 버킷이 생성되었는지 확인
- 버킷 이름이 `course-materials`인지 확인
- Public bucket으로 설정되었는지 확인

### 다운로드 실패: "403 Forbidden"
- RLS 정책이 올바르게 설정되었는지 확인
- 사용자가 해당 강의에 수강 신청했는지 확인
- `course_materials` 테이블이 생성되었는지 확인

### "Database service unavailable"
- 환경 변수가 올바르게 설정되었는지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

## 9. 보안 권장사항

1. **파일 타입 검증**: 허용된 파일 형식만 업로드
2. **파일 크기 제한**: 현재 50MB로 설정됨
3. **바이러스 스캔**: 프로덕션 환경에서는 파일 스캔 권장
4. **정기적인 정리**: 오래된 강의 자료 아카이빙

## 10. API 엔드포인트

```
GET    /api/courses/:courseId/materials          # 강의 자료 목록 조회
POST   /api/courses/:courseId/materials          # 자료 업로드 (메타데이터)
DELETE /api/courses/:courseId/materials/:id      # 자료 삭제
```

## 참고 문서

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [React Upload Tutorial](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
