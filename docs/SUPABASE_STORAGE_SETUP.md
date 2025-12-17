# Supabase Storage 설정 가이드

과제 시스템의 파일 업로드 기능을 사용하기 위한 Supabase Storage 설정 가이드입니다.

## 목차
1. [Storage Bucket 생성](#1-storage-bucket-생성)
2. [RLS 정책 설정](#2-rls-정책-설정)
3. [환경 변수 확인](#3-환경-변수-확인)
4. [테스트 방법](#4-테스트-방법)

---

## 1. Storage Bucket 생성

### 1.1 Supabase 대시보드 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택

### 1.2 Storage 메뉴 이동
1. 좌측 메뉴에서 **Storage** 클릭
2. **Create a new bucket** 버튼 클릭

### 1.3 Bucket 생성 (과제 파일용)
```
Bucket Name: assignment-files
Public bucket: ✅ 체크 (공개 액세스 허용)
File size limit: 10 MB
Allowed MIME types: (비워두기 - 모든 파일 허용)
```

**Create bucket** 버튼 클릭

### 1.4 Bucket 생성 (강의 자료용) - 선택 사항
이미 `course-materials` 버킷이 있다면 건너뛰기
```
Bucket Name: course-materials
Public bucket: ✅ 체크
File size limit: 50 MB
Allowed MIME types: (비워두기)
```

---

## 2. RLS 정책 설정

### 2.1 SQL Editor 접속
1. 좌측 메뉴에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭

### 2.2 RLS 정책 생성

아래 SQL을 실행하여 파일 업로드 권한을 설정합니다:

```sql
-- ============================================
-- Assignment Files Storage RLS Policies
-- ============================================

-- 1. 업로드 정책: 인증된 사용자는 자신의 폴더에만 업로드 가능
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignment-files'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- 2. 조회 정책: 모든 인증된 사용자가 파일 조회 가능
-- (강사가 학생 제출물을 볼 수 있도록)
CREATE POLICY "Authenticated users can view all files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assignment-files');

-- 3. 삭제 정책: 자신이 업로드한 파일만 삭제 가능
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assignment-files'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- ============================================
-- Course Materials Storage RLS Policies (선택)
-- ============================================

-- 강사만 업로드 가능 (user_metadata의 role 확인)
CREATE POLICY "Instructors can upload course materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'instructor'
);

-- 모든 인증된 사용자가 조회 가능
CREATE POLICY "Authenticated users can view course materials"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-materials');

-- 강사만 삭제 가능
CREATE POLICY "Instructors can delete course materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'instructor'
);
```

### 2.3 정책 적용 확인
1. **Storage** > **Policies** 메뉴에서 정책 확인
2. `assignment-files` 버킷에 3개의 정책이 있어야 함:
   - INSERT: "Users can upload to their own folder"
   - SELECT: "Authenticated users can view all files"
   - DELETE: "Users can delete their own files"

---

## 3. 환경 변수 확인

### 3.1 프론트엔드 환경 변수 (.env)
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3.2 백엔드 환경 변수 (.env)
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3.3 환경 변수 확인 방법
Supabase 대시보드 > **Settings** > **API**에서:
- Project URL → `SUPABASE_URL`
- Project API keys > anon public → `SUPABASE_ANON_KEY`
- Project API keys > service_role → `SUPABASE_SERVICE_KEY` (백엔드 전용)

---

## 4. 테스트 방법

### 4.1 개발 서버 실행
```bash
npm run dev:both
```

### 4.2 과제 제출 테스트 (학생 계정)

1. **로그인**
   - 학생 계정으로 로그인 (role: student)

2. **과제 페이지 이동**
   - 수강 중인 강의의 과제 목록에서 과제 클릭
   - URL: `/assignments/:id`

3. **파일 업로드 테스트**
   - 과제 제출 폼에서 파일 선택
   - 10MB 이하의 파일 선택
   - "제출하기" 버튼 클릭
   - 성공 시: "파일 업로드 완료" → "과제가 제출되었습니다" 토스트 메시지

4. **제출 확인**
   - 페이지 새로고침
   - "제출 내역" 섹션에서 첨부 파일 확인
   - 파일명 클릭 시 새 탭에서 파일 열림

### 4.3 과제 생성 테스트 (강사 계정)

1. **로그인**
   - 강사 계정으로 로그인 (role: instructor)

2. **과제 생성 페이지 이동**
   - 강의 상세 페이지에서 "과제 등록" 버튼 클릭
   - 또는 직접 URL 접근: `/courses/:courseId/assignments/new`

3. **과제 등록**
   - 제목, 설명, 만점, 마감일 입력
   - "과제 등록" 버튼 클릭
   - 성공 시: 수강생들에게 실시간 알림 발송

### 4.4 제출 현황 확인 테스트 (강사 계정)

1. **제출 현황 페이지 이동**
   - 과제 목록에서 "제출 현황" 버튼 클릭
   - 또는 직접 URL 접근: `/assignments/:id/submissions`

2. **학생 제출물 확인**
   - 좌측에서 학생 제출물 선택
   - 우측에서 제출 내용 및 첨부 파일 확인

3. **채점하기**
   - 점수 입력 (0 ~ 만점)
   - 피드백 작성 (선택)
   - "채점 완료" 버튼 클릭
   - 성공 시: 학생에게 실시간 알림 발송

### 4.5 Supabase Storage 확인

1. Supabase 대시보드 > **Storage** > `assignment-files` 클릭
2. 폴더 구조 확인:
   ```
   assignment-files/
   └── assignments/
       └── {assignmentId}/
           └── {studentId}/
               └── {timestamp}_{random}.{ext}
   ```

3. 파일 클릭 시 공개 URL로 접근 가능

---

## 5. 문제 해결

### 문제 1: "파일 업로드에 실패했습니다"
**원인:**
- Bucket이 생성되지 않음
- RLS 정책이 올바르지 않음
- 환경 변수 누락

**해결:**
1. Storage 메뉴에서 `assignment-files` 버킷 존재 확인
2. RLS 정책 3개 모두 적용 확인
3. `.env` 파일의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 확인

### 문제 2: "파일 크기는 10MB를 초과할 수 없습니다"
**원인:**
- 파일 크기 제한 초과

**해결:**
- 10MB 이하의 파일 선택
- 필요시 `src/services/uploadService.js`의 `MAX_FILE_SIZE` 수정

### 문제 3: 파일이 업로드되지만 조회 안 됨
**원인:**
- Bucket이 Public으로 설정되지 않음
- SELECT 정책 누락

**해결:**
1. Storage > `assignment-files` 버킷 > Settings > Public bucket 체크
2. SELECT 정책 재확인

### 문제 4: 다른 사용자의 파일 삭제 가능
**원인:**
- DELETE 정책이 올바르지 않음

**해결:**
- 위의 RLS 정책 SQL 재실행
- `(storage.foldername(name))[3] = auth.uid()::text` 조건 확인

---

## 6. 보안 권장 사항

### 6.1 파일 타입 제한
현재는 모든 파일 타입을 허용하지만, 프로덕션 환경에서는 제한 권장:

```javascript
// src/services/uploadService.js
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/*',
  'text/*'
]

if (!validateFileType(file, ALLOWED_FILE_TYPES)) {
  throw new Error('허용되지 않은 파일 형식입니다')
}
```

### 6.2 파일 스캔
프로덕션 환경에서는 악성 파일 스캔 서비스 연동 권장:
- ClamAV
- VirusTotal API
- AWS S3 Malware Scanning

### 6.3 Rate Limiting
파일 업로드 남용 방지를 위한 제한:
- 사용자당 일일 업로드 횟수 제한
- IP 기반 Rate Limiting
- 백엔드 미들웨어에서 구현

---

## 7. 참고 자료

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [파일 업로드 서비스 코드](../src/services/uploadService.js)
- [과제 제출 페이지](../src/pages/AssignmentDetail.jsx)
- [과제 생성 페이지](../src/pages/CreateAssignment.jsx)
- [제출 현황 페이지](../src/pages/AssignmentSubmissions.jsx)

---

## 체크리스트

완료된 항목에 체크하세요:

- [ ] `assignment-files` 버킷 생성 (Public)
- [ ] `course-materials` 버킷 생성 (선택, Public)
- [ ] RLS 정책 3개 적용 (INSERT, SELECT, DELETE)
- [ ] 환경 변수 확인 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] 학생 계정으로 파일 업로드 테스트
- [ ] 강사 계정으로 과제 생성 테스트
- [ ] 강사 계정으로 제출 현황 확인 테스트
- [ ] 강사 계정으로 채점 테스트
- [ ] Supabase Storage에서 파일 확인
- [ ] 공개 URL로 파일 접근 테스트

모든 항목 완료 시 과제 시스템 사용 준비 완료!
