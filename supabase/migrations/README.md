# Supabase 마이그레이션 파일

VerseUp 데이터베이스 스키마를 위한 SQL 마이그레이션 파일들입니다.

## 📁 파일 목록

### 1️⃣ `001_initial_schema.sql` (필수)
**기본 데이터베이스 스키마 생성**

#### 생성되는 테이블:
- **profiles** - 사용자 프로필
  - id, email, name, role (student/instructor/admin), avatar_url
  - 역할 제약조건: CHECK (role IN ('student', 'instructor', 'admin'))

- **courses** - 강의 정보
  - id, title, description, instructor_id, max_students, enrolled_count
  - 제약조건: 종료일 > 시작일, 수강생 수 ≤ 최대 정원

- **enrollments** - 수강 신청
  - id, course_id, student_id, status (active/completed/dropped)
  - 중복 방지: UNIQUE(course_id, student_id)

- **live_sessions** - 라이브 세션
  - id, course_id, title, scheduled_at, duration, status

- **chat_messages** - 채팅 메시지
  - id, session_id, user_id, message, type (text/system)

#### 자동화 기능:
- ✅ **회원가입 시 프로필 자동 생성**
  ```sql
  handle_new_user() - auth.users에서 role 가져와서 profiles 생성
  ```

- ✅ **수강생 수 자동 계산**
  ```sql
  increment_enrolled_count() - 수강 신청 시 +1
  decrement_enrolled_count() - 수강 취소 시 -1
  ```

- ✅ **타임스탬프 자동 업데이트**
  ```sql
  update_updated_at_column() - 레코드 수정 시 updated_at 자동 갱신
  ```

---

### 2️⃣ `002_rls_policies.sql` (필수)
**Row Level Security 정책 설정**

#### 역할별 권한:

**학생 (student)** 🎓
- ✅ 모든 프로필 조회
- ✅ 본인 프로필 수정
- ✅ 모든 강의 조회
- ✅ 강의 수강 신청
- ✅ 본인 수강 정보 조회/수정
- ✅ 수강 중인 세션 채팅 참여
- ❌ 강의 생성/수정/삭제 불가

**강사 (instructor)** 👨‍🏫
- ✅ 학생의 모든 권한
- ✅ 강의 생성
- ✅ 본인 강의 수정/삭제
- ✅ 본인 강의의 라이브 세션 관리
- ✅ 본인 강의 수강생 목록 조회
- ❌ 다른 강사의 강의 수정/삭제 불가

**관리자 (admin)** 👑
- ✅ 모든 데이터 접근
- ✅ 모든 강의 수정/삭제
- ✅ 모든 사용자 정보 조회
- ✅ 모든 채팅 메시지 관리

#### 주요 정책:

**Courses (강의)**
```sql
-- 강사와 관리자만 강의 생성 가능
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('instructor', 'admin')
  )
)
```

**Enrollments (수강 신청)**
```sql
-- 학생만 수강 신청 가능
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'student'
  )
)
```

---

### 3️⃣ `003_improvements.sql` (선택사항)
**추가 개선 및 최적화**

#### 성능 최적화:
- 📊 role 인덱스 추가 (역할 기반 쿼리 최적화)
- 📊 복합 인덱스 추가 (student_id + status)
- 📊 상태별 세션 조회 최적화

#### 헬퍼 함수:
```sql
-- 강사 또는 관리자 확인
is_instructor_or_admin(user_id UUID) → BOOLEAN

-- 관리자 확인
is_admin(user_id UUID) → BOOLEAN

-- 사용자 역할 조회
get_user_role(user_id UUID) → TEXT
```

#### 보안 강화:
- 🛡️ **수강 정원 자동 체크**
  - 정원 초과 시 자동으로 에러 발생
  ```sql
  check_enrollment_capacity() - BEFORE INSERT trigger
  ```

- 🛡️ **역할 권한 상승 방지**
  - 일반 사용자가 스스로 admin이 되는 것 방지
  ```sql
  prevent_role_escalation() - BEFORE UPDATE trigger
  ```

#### 감사 로그:
- 📝 audit_logs 테이블 생성
- 📝 역할 변경 자동 추적
- 📝 관리자만 조회 가능

#### 유용한 뷰:
```sql
-- 강의 통계 뷰
course_statistics
  - 수강률, 남은 자리, 세션 수 등

-- 사용자 수강 요약 뷰
user_enrollment_summary
  - 활성 수강, 완료 강의, 중도 포기 통계
```

---

### 4️⃣ `004_profile_management.sql` (권장)
**프로필 관리 기능**

#### 프로필 관리 함수:
```sql
-- 프로필 정보 업데이트
update_profile(user_id, new_name, new_avatar_url) → JSONB

-- 회원 탈퇴 (CASCADE 삭제)
delete_user() → VOID

-- 사용자 통계 조회
get_profile_stats(user_id) → JSONB

-- 이메일 변경 요청 (유효성 검사)
request_email_change(new_email) → JSONB
```

#### 기능:
- ✅ **프로필 업데이트**
  - 이름, 아바타 URL 변경
  - updated_at 자동 갱신
  - RLS로 본인만 수정 가능

- ✅ **회원 탈퇴**
  - 계정 영구 삭제
  - CASCADE로 모든 관련 데이터 삭제
  - 수강 신청, 강의, 채팅 등 모두 제거

- ✅ **통계 정보**
  - 역할별 맞춤 통계
  - 학생: 수강 현황
  - 강사: 강의 및 학생 수
  - 관리자: 전체 시스템 통계

#### 삭제되는 데이터 (CASCADE):
```
auth.users → profiles
    ↓
    ├── enrollments (수강 신청)
    ├── courses (강의)
    │   ├── live_sessions
    │   └── enrollments
    └── chat_messages
```

---

## 🚀 설치 순서

### Supabase SQL Editor에서:

1. **001_initial_schema.sql** 실행 (필수)
   - 모든 테이블과 기본 기능 생성

2. **002_rls_policies.sql** 실행 (필수)
   - 보안 정책 적용

3. **003_improvements.sql** 실행 (선택)
   - 추가 기능 및 최적화

4. **004_profile_management.sql** 실행 (권장)
   - 프로필 관리 기능

5. **005_test_accounts.sql** 읽기 전용 (참고용)
   - 테스트 계정 생성 가이드
   - 실행 불필요, 문서로만 참고

6. **006_add_course_code.sql** 실행 (권장)
   - 강의 수강번호 및 추가 필드
   - 기존 courses 테이블에 컬럼 추가

7. **012_fix_enrollment_count_on_drop.sql** 실행 (권장) ⭐ NEW
   - 수강 취소 시 enrolled_count 자동 감소
   - 재수강 시 자동 증가

---

### 6️⃣ `006_add_course_code.sql` (권장)
**강의 테이블 확장**

#### 추가되는 필드:
- **course_code** - 고유 수강번호 (예: CS101, MATH201)
  - 자동 생성 또는 수동 입력 가능
  - UNIQUE 제약조건

- **category** - 강의 카테고리
  - 예: programming, math, design, business

- **level** - 난이도
  - beginner (초급)
  - intermediate (중급)
  - advanced (고급)

- **status** - 강의 상태
  - draft (초안)
  - published (공개)
  - archived (보관)

- **price** - 강의 가격
  - 0 = 무료
  - 양수 = 유료 (단위: 원)

#### 자동 생성 기능:
```sql
-- 강의 생성 시 자동으로 수강번호 생성
generate_course_code('Web Development') → 'WEB123'
generate_course_code('Introduction to AI') → 'INT456'
```

#### 인덱스:
- course_code (빠른 조회)
- category (카테고리별 필터링)
- status (공개/초안 필터링)

---

## 🧪 테스트 계정 생성

개발 및 테스트를 위한 테스트 계정:

**Supabase Dashboard → Authentication → Users에서 생성:**

1. **학생 계정**
   - Email: `student@test.com`
   - Password: `test123`
   - Auto Confirm: ✅
   - User Metadata: `{"name": "테스트 학생", "role": "student"}`

2. **강사 계정**
   - Email: `instructor@test.com`
   - Password: `test123`
   - Auto Confirm: ✅
   - User Metadata: `{"name": "테스트 강사", "role": "instructor"}`

**로그인 페이지에서 원클릭 테스트:**
- 🎓 "학생으로 테스트" 버튼
- 👨‍🏫 "강사로 테스트" 버튼

**상세 가이드:** [docs/TEST_ACCOUNTS.md](../../docs/TEST_ACCOUNTS.md)

---

## ✅ 설치 확인

### 1. 테이블 확인
Supabase Dashboard → Table Editor에서 확인:
- [ ] profiles
- [ ] courses
- [ ] enrollments
- [ ] live_sessions
- [ ] chat_messages
- [ ] audit_logs (003 실행 시)

### 2. 트리거 확인
SQL Editor에서 실행:
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

예상 결과:
- on_auth_user_created (auth.users)
- update_profiles_updated_at (profiles)
- update_courses_updated_at (courses)
- increment_course_enrolled_count (enrollments)
- decrement_course_enrolled_count (enrollments)
- check_enrollment_capacity_trigger (003 실행 시)
- prevent_role_escalation_trigger (003 실행 시)

### 3. RLS 정책 확인
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 4. 역할 테스트
회원가입 후 profiles 테이블 확인:
```sql
SELECT id, email, name, role
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🔧 문제 해결

### "relation already exists" 오류
→ 테이블이 이미 존재합니다. DROP TABLE 후 재실행하거나, 기존 데이터 유지 시 ALTER TABLE 사용

### "function already exists" 오류
→ `CREATE OR REPLACE FUNCTION`이므로 무시해도 됩니다

### RLS 정책 오류
→ Authentication → Policies에서 정책 확인 및 수정

### 트리거가 작동하지 않음
→ SQL Editor에서 트리거 목록 확인 후 재생성

---

## 📝 역할 변경 방법

### 관리자 지정:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

### 강사로 변경:
```sql
UPDATE public.profiles
SET role = 'instructor'
WHERE email = 'teacher@example.com';
```

### 학생으로 변경:
```sql
UPDATE public.profiles
SET role = 'student'
WHERE email = 'student@example.com';
```

**주의:** 역할 변경 후 사용자는 재로그인해야 합니다.

---

### 7️⃣ `012_fix_enrollment_count_on_drop.sql` (권장) ⭐ NEW
**수강 취소 시 enrolled_count 자동 업데이트**

#### 문제점:
기존 트리거는 **DELETE**에만 반응했지만, 실제 수강 취소는 **UPDATE** (status를 'dropped'로 변경)를 사용합니다.
이로 인해 수강 취소 시 enrolled_count가 자동으로 감소하지 않는 문제가 있었습니다.

#### 해결 방법:
새로운 트리거가 다음 상황을 모두 처리합니다:
1. ✅ **수강 취소** (active → dropped): enrolled_count -1
2. ✅ **재수강** (dropped → active): enrolled_count +1
3. ✅ **완전 삭제** (DELETE): enrolled_count -1
4. ✅ **음수 방지**: GREATEST(0, count) 사용

#### 자동화 기능:
```sql
-- 수강 취소 시
UPDATE enrollments SET status = 'dropped'
WHERE student_id = 'xxx' AND course_id = 'yyy';
→ 트리거가 자동으로 courses.enrolled_count - 1

-- 재수강 시
UPDATE enrollments SET status = 'active'
WHERE student_id = 'xxx' AND course_id = 'yyy';
→ 트리거가 자동으로 courses.enrolled_count + 1
```

#### 주의사항:
- 이 마이그레이션은 기존 `decrement_course_enrolled_count` 트리거를 교체합니다
- 프론트엔드에서 수동으로 enrolled_count를 조작할 필요가 없습니다
- 반드시 Supabase SQL Editor에서 실행하세요

---

## 📚 추가 문서

- [SUPABASE_SETUP.md](../../SUPABASE_SETUP.md) - Supabase 초기 설정 가이드
- [ROLE_BASED_AUTH.md](../../docs/ROLE_BASED_AUTH.md) - 역할 기반 인증 시스템 상세 설명
