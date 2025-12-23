# Supabase 사용 현황 분석

## ✅ 올바른 사용 (인증 관련 - 프론트엔드에서 직접 사용)

### 인증 관련 (문제 없음)
- **authStore.js**: `supabase.auth.signOut()` - 로그아웃
- **Login.jsx**: `supabase.auth.signInWithPassword()`, `signInWithOAuth()` - 로그인
- **Register.jsx**: `supabase.auth.signUp()`, `signInWithOAuth()` - 회원가입
- **Profile.jsx**: `supabase.auth.updateUser()` - 프로필/비밀번호 업데이트
- **App.jsx**: `supabase.auth.onAuthStateChange()` - 인증 상태 감지

**결론**: 인증 관련은 Supabase Auth를 직접 사용하는 것이 정상입니다. ✅

---

## ❌ 문제 있는 사용 (백엔드 API로 변경 필요)

### 1. courseService.js

#### `getMyCourses()` (88-115행)
- **현재**: Supabase에서 직접 courses 테이블 조회
- **문제**: RLS 정책에 의존, anon key 사용
- **해결**: 백엔드 API `GET /api/courses/my` 필요

#### `getCourseById()` (120-141행)
- **현재**: Supabase에서 직접 courses 테이블 조회
- **문제**: 공개 강의는 괜찮지만 일관성 필요
- **해결**: 백엔드 API `GET /api/courses/:id` 이미 존재하는지 확인 필요

#### `updateCourse()` (146-186행)
- **현재**: Supabase에서 직접 courses 테이블 업데이트
- **문제**: RLS 우회 불가, 권한 검증 클라이언트에서 처리
- **해결**: 백엔드 API `PUT /api/courses/:id` 필요

#### `deleteCourse()` (191-221행)
- **현재**: Supabase에서 직접 courses 테이블 삭제
- **문제**: RLS 우회 불가, 권한 검증 클라이언트에서 처리
- **해결**: 백엔드 API `DELETE /api/courses/:id` 필요

#### `getInstructorStats()` (233-274행)
- **현재**: Supabase에서 직접 courses 테이블 조회 후 통계 계산
- **문제**: RLS 정책에 의존
- **해결**: 백엔드 API `GET /api/instructors/stats` 필요

#### `uploadMaterial()` (279-331행)
- **현재**: Supabase Storage에 직접 업로드
- **문제**: 이미 백엔드 업로드 API가 존재 (`POST /courses/:id/materials/upload`)
- **해결**: 이 메서드 삭제 또는 백엔드 API 호출로 변경

---

### 2. uploadService.js

#### `uploadAssignmentFile()` (10-55행)
- **현재**: Supabase Storage `assignment-files`에 직접 업로드
- **문제**: RLS 우회 불가, 권한 검증 없음
- **해결**: 백엔드 API `POST /api/assignments/:id/upload` 필요

#### `uploadCourseMaterial()` (64-106행)
- **현재**: Supabase Storage `course-materials`에 직접 업로드
- **문제**: 이미 백엔드 업로드 API가 존재
- **해결**: 이 함수 삭제 또는 사용 중지

#### `deleteFile()` (114-136행)
- **현재**: Supabase Storage에서 직접 파일 삭제
- **문제**: RLS 우회 불가, 권한 검증 없음
- **해결**: 백엔드 API `DELETE /api/files` 필요 (또는 각 리소스 삭제 시 포함)

---

### 3. AssignmentDetail.jsx
- **현재**: `import { supabase } from '@/lib/supabase'` 있지만 사용 안 함
- **해결**: import 문 제거

---

## 📊 통계

- **총 Supabase 사용 파일**: 8개
- **인증 관련 (정상)**: 5개 ✅
- **데이터 조회/수정 (문제)**: 3개 ❌
  - courseService.js: 6개 메서드
  - uploadService.js: 3개 함수
  - AssignmentDetail.jsx: 미사용 import

---

## 🎯 권장 작업 순서

### 우선순위 1 (높음)
1. **courseService.js 수정**:
   - 백엔드에 API 추가: `GET /api/courses/my`, `PUT /api/courses/:id`, `DELETE /api/courses/:id`, `GET /api/instructors/stats`
   - courseService 메서드들을 백엔드 API 호출로 변경

### 우선순위 2 (중간)
2. **uploadService.js 수정**:
   - 과제 파일 업로드 백엔드 API 추가: `POST /api/assignments/:id/upload`
   - `uploadCourseMaterial()` 삭제 또는 사용 중지 (이미 백엔드 API 있음)
   - 파일 삭제 백엔드 API 추가

### 우선순위 3 (낮음)
3. **정리 작업**:
   - AssignmentDetail.jsx에서 미사용 import 제거

---

## ✅ 완료된 작업

- ✅ enrollmentService: `isEnrolled()`, `getMyEnrollments()` → 백엔드 API로 변경 완료
- ✅ CourseMaterials 업로드 → 백엔드 API로 변경 완료
