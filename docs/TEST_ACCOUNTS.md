# 테스트 계정 가이드

개발 및 테스트를 위한 테스트 계정 설정 및 사용 가이드입니다.

## 🎯 테스트 계정 정보

### 학생 계정
- **이메일**: `student@test.com`
- **비밀번호**: `test123`
- **역할**: 🎓 학생 (student)
- **이름**: 테스트 학생

### 강사 계정
- **이메일**: `instructor@test.com`
- **비밀번호**: `test123`
- **역할**: 👨‍🏫 강사 (instructor)
- **이름**: 테스트 강사

---

## 🚀 테스트 계정 생성 방법

### 방법 1: Supabase Dashboard 사용 (권장)

1. **Supabase Dashboard 접속**
   - https://app.supabase.com
   - 프로젝트 선택

2. **Authentication → Users로 이동**
   - 왼쪽 메뉴에서 "Authentication" 클릭
   - "Users" 탭 선택

3. **학생 계정 생성**
   - "Add user" 버튼 클릭
   - "Create new user" 선택
   - 정보 입력:
     ```
     Email: student@test.com
     Password: test123
     ☑ Auto Confirm User (이메일 확인 건너뛰기)
     ```
   - "User Metadata" 섹션 확장
   - JSON 입력:
     ```json
     {
       "name": "테스트 학생",
       "role": "student"
     }
     ```
   - "Create user" 클릭

4. **강사 계정 생성**
   - 위 과정 반복
   - 정보 입력:
     ```
     Email: instructor@test.com
     Password: test123
     ☑ Auto Confirm User
     ```
   - User Metadata:
     ```json
     {
       "name": "테스트 강사",
       "role": "instructor"
     }
     ```

5. **프로필 자동 생성 확인**
   - Table Editor → profiles 테이블 확인
   - 두 계정의 프로필이 자동으로 생성되었는지 확인

---

### 방법 2: SQL 사용 (수동)

테스트 계정이 이미 auth.users에 생성되어 있지만 프로필이 없는 경우:

```sql
-- 1. auth.users에서 테스트 계정 UUID 확인
SELECT id, email FROM auth.users
WHERE email IN ('student@test.com', 'instructor@test.com');

-- 2. 학생 프로필 수동 생성
INSERT INTO public.profiles (id, email, name, role)
VALUES (
  'student-user-uuid-here'::UUID,
  'student@test.com',
  '테스트 학생',
  'student'
)
ON CONFLICT (email) DO UPDATE
SET name = '테스트 학생', role = 'student';

-- 3. 강사 프로필 수동 생성
INSERT INTO public.profiles (id, email, name, role)
VALUES (
  'instructor-user-uuid-here'::UUID,
  'instructor@test.com',
  '테스트 강사',
  'instructor'
)
ON CONFLICT (email) DO UPDATE
SET name = '테스트 강사', role = 'instructor';
```

---

## 💻 테스트 로그인 사용법

### 로그인 페이지에서 원클릭 테스트 로그인

1. **로그인 페이지 접속**
   - http://localhost:5173/login

2. **테스트 계정 버튼 클릭**
   - 🎓 **"학생으로 테스트"** 버튼: 학생 계정으로 자동 로그인
   - 👨‍🏫 **"강사로 테스트"** 버튼: 강사 계정으로 자동 로그인

3. **자동 리디렉트**
   - 로그인 성공 시 Dashboard로 자동 이동
   - 헤더에 사용자 이름 표시 확인

### UI 구성

```
┌────────────────────────────────────┐
│  로그인                             │
│  ─────────────────────────────────  │
│  [이메일 입력]                      │
│  [비밀번호 입력]                    │
│  [로그인 버튼]                      │
│                                     │
│  ───── 또는 ─────                   │
│  [Google로 로그인]                  │
│                                     │
│  ───── 테스트 계정 ─────            │
│  [🎓 학생으로] [👨‍🏫 강사로]       │
│                                     │
│  계정이 없으신가요? 회원가입        │
└────────────────────────────────────┘
```

---

## 🧪 테스트 시나리오

### 학생 계정 테스트

1. **로그인**
   - "학생으로 테스트" 버튼 클릭
   - Dashboard 접속 확인

2. **권한 확인**
   - ✅ 강의 목록 조회 가능
   - ✅ 강의 수강 신청 가능
   - ✅ 채팅 참여 가능
   - ❌ 강의 생성 버튼 없음 (권한 없음)

3. **프로필 관리**
   - "설정" → 프로필 정보 수정
   - 비밀번호 변경 가능
   - 역할은 "학생"으로 고정

4. **수강 신청**
   - 강의 목록에서 수강 신청
   - 내 강의 목록 확인

---

### 강사 계정 테스트

1. **로그인**
   - "강사로 테스트" 버튼 클릭
   - Dashboard 접속 확인

2. **권한 확인**
   - ✅ 강의 생성 가능
   - ✅ 본인 강의 수정/삭제 가능
   - ✅ 라이브 세션 생성/관리 가능
   - ✅ 수강생 목록 조회 가능
   - ❌ 다른 강사의 강의 수정 불가

3. **강의 생성**
   - 강의 생성 버튼 클릭
   - 강의 정보 입력 및 저장
   - 생성된 강의 확인

4. **세션 관리**
   - 강의 상세 → 라이브 세션 추가
   - 세션 시작/종료 테스트

---

## 🔒 보안 주의사항

### ⚠️ 개발 환경 전용

테스트 계정은 **개발 및 테스트 환경에서만** 사용해야 합니다:

- ✅ **로컬 개발**: localhost:5173
- ✅ **테스트 서버**: test.verseup.com
- ❌ **프로덕션**: verseup.com (절대 금지!)

### 🚫 프로덕션 배포 전 필수 작업

프로덕션 배포 전 테스트 계정을 **반드시 삭제**하세요:

```sql
-- Supabase SQL Editor에서 실행

-- 1. 테스트 계정 확인
SELECT id, email, role FROM public.profiles
WHERE email IN ('student@test.com', 'instructor@test.com');

-- 2. 테스트 계정 삭제
DELETE FROM auth.users
WHERE email IN ('student@test.com', 'instructor@test.com');

-- 3. 프로필 삭제 확인 (CASCADE로 자동 삭제되어야 함)
SELECT * FROM public.profiles
WHERE email IN ('student@test.com', 'instructor@test.com');
-- 결과: 0 rows (정상)
```

### 환경별 분리

환경 변수로 테스트 로그인 버튼 표시 제어:

```typescript
// .env.development
VITE_ENABLE_TEST_LOGIN=true

// .env.production
VITE_ENABLE_TEST_LOGIN=false

// Login.tsx에서 사용
const showTestLogin = import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true'

{showTestLogin && (
  <div>테스트 로그인 버튼들</div>
)}
```

---

## 🛠️ 문제 해결

### "User not found" 오류

**원인:** 테스트 계정이 생성되지 않음

**해결:**
1. Supabase Dashboard → Authentication → Users 확인
2. 테스트 계정이 없으면 위의 "방법 1" 따라 생성
3. User Metadata에 role이 올바르게 설정되었는지 확인

---

### "Invalid login credentials" 오류

**원인:** 비밀번호가 틀림

**해결:**
1. 비밀번호가 정확히 `test123`인지 확인
2. Supabase Dashboard에서 비밀번호 재설정:
   - Users → 해당 사용자 선택
   - "Reset Password" 클릭
   - 새 비밀번호: `test123`

---

### 프로필이 생성되지 않음

**원인:** handle_new_user() 트리거가 작동하지 않음

**해결:**
```sql
-- 1. 트리거 확인
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. 트리거가 없으면 001_initial_schema.sql 재실행

-- 3. 수동으로 프로필 생성 (위의 "방법 2" 참조)
```

---

### 역할이 올바르지 않음

**원인:** User Metadata에 role이 누락되거나 잘못됨

**해결:**
```sql
-- Supabase Dashboard → Authentication → Users
-- 해당 사용자 선택 → User Metadata 수정

-- 또는 SQL로 직접 수정:
UPDATE public.profiles
SET role = 'student'  -- 또는 'instructor'
WHERE email = 'student@test.com';
```

---

## 📊 테스트 데이터 초기화

테스트 중 생성된 데이터를 모두 삭제하고 싶은 경우:

```sql
-- 주의: 테스트 계정의 모든 데이터가 삭제됩니다!

-- 1. 학생 테스트 계정의 수강 신청 삭제
DELETE FROM public.enrollments
WHERE student_id IN (
  SELECT id FROM public.profiles
  WHERE email = 'student@test.com'
);

-- 2. 강사 테스트 계정의 강의 삭제 (CASCADE로 세션도 삭제)
DELETE FROM public.courses
WHERE instructor_id IN (
  SELECT id FROM public.profiles
  WHERE email = 'instructor@test.com'
);

-- 3. 채팅 메시지 삭제
DELETE FROM public.chat_messages
WHERE user_id IN (
  SELECT id FROM public.profiles
  WHERE email IN ('student@test.com', 'instructor@test.com')
);

-- 4. 프로필은 유지 (계정만 초기화)
```

---

## 🔗 관련 파일

### 프론트엔드
- `src/pages/Login.tsx` - 테스트 로그인 버튼 구현
  - Line 68-116: handleTestLogin() 함수
  - Line 199-214: 테스트 버튼 UI

### 백엔드
- `supabase/migrations/005_test_accounts.sql` - 테스트 계정 SQL

### 문서
- `SUPABASE_SETUP.md` - Supabase 설정 가이드
- `ROLE_BASED_AUTH.md` - 역할 기반 인증 설명

---

## ✅ 체크리스트

테스트 계정 설정 완료 확인:

- [ ] Supabase에서 학생 계정 생성 완료
- [ ] Supabase에서 강사 계정 생성 완료
- [ ] User Metadata에 role 올바르게 설정
- [ ] Auto Confirm User 체크됨 (이메일 확인 스킵)
- [ ] profiles 테이블에 두 계정 존재 확인
- [ ] 로그인 페이지에 테스트 버튼 표시 확인
- [ ] 학생 계정으로 로그인 성공
- [ ] 강사 계정으로 로그인 성공
- [ ] 각 계정의 권한 정상 작동 확인

---

## 🎓 추가 테스트 계정 생성

필요시 추가 테스트 계정을 만들 수 있습니다:

```
관리자 테스트 계정:
Email: admin@test.com
Password: test123
User Metadata: {"name": "테스트 관리자", "role": "admin"}
```

**참고:** 관리자 계정은 생성 후 SQL로 role을 'admin'으로 변경해야 합니다:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@test.com';
```

---

## 📝 마이그레이션 파일

`supabase/migrations/005_test_accounts.sql` 파일에는:
- 테스트 계정 생성 가이드
- 수동 프로필 생성 SQL 예시
- 테스트 계정 삭제 SQL (프로덕션용)
- 확인 쿼리

이 파일은 실행할 필요는 없으며, 참고용 문서입니다.
