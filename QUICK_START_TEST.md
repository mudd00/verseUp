# 🚀 빠른 시작 - 테스트 계정 생성

테스트 로그인 버튼을 사용하기 전에 Supabase에서 테스트 계정을 먼저 생성해야 합니다.

## ⚡ 5분 만에 테스트 계정 만들기

### 1단계: Supabase Dashboard 접속

1. https://app.supabase.com 접속
2. VerseUp 프로젝트 선택
3. 왼쪽 메뉴에서 **Authentication** 클릭
4. **Users** 탭 선택

---

### 2단계: 학생 테스트 계정 생성

1. **"Add user"** 버튼 클릭
2. **"Create new user"** 선택
3. 다음 정보 입력:

```
Email address: student@test.com
Password: test123
```

4. ✅ **"Auto Confirm User"** 체크박스를 반드시 체크하세요!
   (이메일 확인 없이 바로 사용 가능)

5. **"User Metadata"** 섹션 확장 (아래 화살표 클릭)

6. JSON 입력:
```json
{
  "name": "테스트 학생",
  "role": "student"
}
```

7. **"Create user"** 버튼 클릭

---

### 3단계: 강사 테스트 계정 생성

위와 동일한 과정 반복:

1. **"Add user"** → **"Create new user"**
2. 정보 입력:
```
Email address: instructor@test.com
Password: test123
☑ Auto Confirm User (반드시 체크!)
```

3. User Metadata:
```json
{
  "name": "테스트 강사",
  "role": "instructor"
}
```

4. **"Create user"** 클릭

---

### 4단계: 프로필 생성 확인

1. Supabase Dashboard에서 **Table Editor** 선택
2. **profiles** 테이블 클릭
3. 다음 2개의 레코드가 보여야 합니다:
   - ✅ `student@test.com` (역할: student)
   - ✅ `instructor@test.com` (역할: instructor)

만약 프로필이 없다면 아래 SQL을 실행하세요.

---

## 🔧 프로필이 자동 생성되지 않은 경우

**SQL Editor로 이동** (왼쪽 메뉴) 후 다음 쿼리 실행:

```sql
-- 1. auth.users에서 UUID 확인
SELECT id, email FROM auth.users
WHERE email IN ('student@test.com', 'instructor@test.com');

-- 2. 위에서 나온 UUID를 복사한 후 아래 쿼리 실행
-- (student-uuid-here와 instructor-uuid-here를 실제 UUID로 교체)

-- 학생 프로필 생성
INSERT INTO public.profiles (id, email, name, role)
VALUES (
  'student-uuid-here'::UUID,  -- 1번 쿼리에서 복사한 UUID
  'student@test.com',
  '테스트 학생',
  'student'
)
ON CONFLICT (id) DO UPDATE
SET name = '테스트 학생', role = 'student';

-- 강사 프로필 생성
INSERT INTO public.profiles (id, email, name, role)
VALUES (
  'instructor-uuid-here'::UUID,  -- 1번 쿼리에서 복사한 UUID
  'instructor@test.com',
  '테스트 강사',
  'instructor'
)
ON CONFLICT (id) DO UPDATE
SET name = '테스트 강사', role = 'instructor';
```

---

## ✅ 테스트하기

### 로그인 페이지에서 테스트:

1. 애플리케이션 실행: `npm run dev:both`
2. http://localhost:5173/login 접속
3. 테스트 버튼 클릭:
   - 🎓 **"학생으로 테스트"** → 학생으로 자동 로그인
   - 👨‍🏫 **"강사로 테스트"** → 강사로 자동 로그인

4. Dashboard로 자동 이동 확인

---

## 🐛 여전히 로그인이 안 되는 경우

### 에러: "Invalid login credentials"

**원인:** 비밀번호가 틀리거나 계정이 확인되지 않음

**해결:**
1. Supabase Dashboard → Authentication → Users
2. 해당 계정 클릭
3. **"Reset Password"** 클릭
4. 새 비밀번호: `test123` 입력
5. **"Confirm"** 상태가 `true`인지 확인
   - `false`면 우측 메뉴에서 "Confirm Email" 클릭

---

### 에러: "User not found"

**원인:** 계정이 생성되지 않음

**해결:**
1. Authentication → Users에서 계정 존재 확인
2. 없으면 위의 2단계, 3단계 다시 진행

---

### 에러: "Email not confirmed"

**원인:** Auto Confirm User를 체크하지 않음

**해결:**
1. Users 탭에서 해당 계정 클릭
2. 우측 메뉴에서 **"Confirm Email"** 버튼 클릭

---

## 📸 스크린샷 가이드

### User 생성 화면 예시:

```
┌─────────────────────────────────────────────┐
│ Create new user                              │
├─────────────────────────────────────────────┤
│ Email address *                              │
│ [student@test.com                        ]  │
│                                              │
│ Password *                                   │
│ [test123                                 ]  │
│                                              │
│ ☑ Auto Confirm User                         │
│                                              │
│ ▼ User Metadata                              │
│ {                                            │
│   "name": "테스트 학생",                     │
│   "role": "student"                          │
│ }                                            │
│                                              │
│          [Cancel]  [Create user]            │
└─────────────────────────────────────────────┘
```

---

## 📝 체크리스트

계정 생성 완료 확인:

- [ ] Supabase Dashboard → Authentication → Users 접속
- [ ] student@test.com 계정 생성 완료
- [ ] instructor@test.com 계정 생성 완료
- [ ] Auto Confirm User 체크됨
- [ ] User Metadata에 name, role 입력됨
- [ ] Table Editor → profiles에 2개 레코드 존재
- [ ] 로그인 페이지에서 테스트 버튼 클릭 성공
- [ ] Dashboard로 정상 리디렉트

---

## 🎯 다음 단계

테스트 계정으로 다음 기능들을 테스트하세요:

**학생 계정으로:**
- ✅ 강의 목록 조회
- ✅ 강의 수강 신청
- ✅ 프로필 정보 수정
- ✅ 비밀번호 변경

**강사 계정으로:**
- ✅ 강의 생성
- ✅ 라이브 세션 관리
- ✅ 수강생 목록 조회

---

## ⚠️ 주의사항

1. **개발 환경 전용**: 테스트 계정은 로컬 개발에서만 사용
2. **프로덕션 금지**: 배포 전 반드시 삭제
3. **비밀번호 단순**: `test123`은 테스트용이므로 프로덕션에서는 절대 사용 금지

---

## 🆘 도움이 필요한 경우

1. `docs/TEST_ACCOUNTS.md` - 상세 가이드
2. `SUPABASE_SETUP.md` - Supabase 전체 설정
3. Supabase Dashboard → Project Settings → API - URL과 키 확인
