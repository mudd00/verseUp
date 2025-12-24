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

## ✅ 이전 문제 있던 사용 (모두 해결 완료)

### 1. courseService.js - ✅ 해결됨

#### `getMyCourses()`
- **변경 전**: Supabase에서 직접 courses 테이블 조회
- **변경 후**: 백엔드 API `GET /api/courses/my` 사용

#### `getCourseById()`
- **변경 전**: Supabase에서 직접 courses 테이블 조회
- **변경 후**: 백엔드 API `GET /api/courses/:id` 사용

#### `updateCourse()`
- **변경 전**: Supabase에서 직접 courses 테이블 업데이트
- **변경 후**: 백엔드 API `PUT /api/courses/:id` 사용

#### `deleteCourse()`
- **변경 전**: Supabase에서 직접 courses 테이블 삭제
- **변경 후**: 백엔드 API `DELETE /api/courses/:id` 사용

#### `getInstructorStats()`
- **변경 전**: Supabase에서 직접 courses 테이블 조회 후 통계 계산
- **변경 후**: 백엔드 API `GET /api/courses/instructors/stats` 사용

#### `uploadMaterial()`
- **변경 전**: Supabase Storage에 직접 업로드
- **변경 후**: deprecated 처리 (백엔드 API 직접 사용 권장)

---

### 2. uploadService.js - ✅ 해결됨

#### `uploadAssignmentFile()`
- **변경 전**: Supabase Storage `assignment-files`에 직접 업로드
- **변경 후**: 백엔드 API `POST /api/assignments/:id/upload` 사용

#### `uploadCourseMaterial()`
- **변경 전**: Supabase Storage `course-materials`에 직접 업로드
- **변경 후**: deprecated 처리 (백엔드 API 직접 사용 권장)

#### `deleteFile()`
- **변경 전**: Supabase Storage에서 직접 파일 삭제
- **변경 후**: deprecated 처리 (리소스 삭제 시 자동 처리)

---

### 3. AssignmentDetail.jsx - ✅ 해결됨
- **변경 전**: `import { supabase } from '@/lib/supabase'` 있지만 사용 안 함
- **변경 후**: import 문 제거 완료

---

## 📊 통계

- **총 Supabase 사용 파일**: 8개
- **인증 관련 (정상)**: 5개 ✅
- **데이터 조회/수정**: ~~3개 ❌~~ → **모두 해결됨 ✅**
  - courseService.js: ~~6개 메서드~~ → ✅ 모두 백엔드 API로 변경
  - uploadService.js: ~~3개 함수~~ → ✅ 모두 백엔드 API로 변경
  - AssignmentDetail.jsx: ~~미사용 import~~ → ✅ 제거 완료

---

## 🎯 ~~권장 작업 순서~~ → ✅ 모든 작업 완료!

### ~~우선순위 1 (높음)~~ ✅ 완료
1. **courseService.js 수정**:
   - ✅ 백엔드에 API 추가: `GET /api/courses/my`, `GET /api/courses/instructors/stats`
   - ✅ courseService 메서드들을 백엔드 API 호출로 변경

### ~~우선순위 2 (중간)~~ ✅ 완료
2. **uploadService.js 수정**:
   - ✅ 과제 파일 업로드 백엔드 API 추가: `POST /api/assignments/:id/upload`
   - ✅ `uploadCourseMaterial()` deprecated 처리
   - ✅ `deleteFile()` deprecated 처리

### ~~우선순위 3 (낮음)~~ ✅ 완료
3. **정리 작업**:
   - ✅ AssignmentDetail.jsx에서 미사용 import 제거

---

## ✅ 완료된 작업

- ✅ enrollmentService: `isEnrolled()`, `getMyEnrollments()` → 백엔드 API로 변경 완료
- ✅ CourseMaterials 업로드 → 백엔드 API로 변경 완료
- ✅ courseService.js: 모든 메서드 백엔드 API로 변경 완료
  - `getMyCourses()` → `GET /api/courses/my`
  - `getCourseById()` → `GET /api/courses/:id`
  - `updateCourse()` → `PUT /api/courses/:id`
  - `deleteCourse()` → `DELETE /api/courses/:id`
  - `getInstructorStats()` → `GET /api/courses/instructors/stats`
  - `uploadMaterial()` → deprecated (백엔드 API 직접 사용)
- ✅ uploadService.js: 모든 함수 백엔드 API로 변경 완료
  - `uploadAssignmentFile()` → `POST /api/assignments/:id/upload`
  - `uploadCourseMaterial()` → deprecated (백엔드 API 직접 사용)
  - `deleteFile()` → deprecated (리소스 삭제 시 자동 처리)
- ✅ AssignmentDetail.jsx: 미사용 supabase import 제거 완료
