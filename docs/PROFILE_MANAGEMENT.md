# 프로필 관리 시스템

사용자 프로필 정보 수정, 비밀번호 변경, 회원 탈퇴 기능에 대한 문서입니다.

## 📍 접근 경로

**URL:** `/profile`
**권한:** 로그인한 사용자만 접근 가능 (PrivateRoute)
**헤더 메뉴:** "설정" 버튼 클릭

---

## 🎨 UI 구성

프로필 설정 페이지는 3개의 탭으로 구성됩니다:

### 1. 👤 프로필 정보
사용자의 기본 정보를 수정합니다.

**수정 가능 항목:**
- ✅ **이름** (필수)
- ✅ **프로필 이미지 URL** (선택)

**수정 불가 항목:**
- ❌ **이메일** - 보안상 이유로 변경 불가
- ❌ **역할** - 관리자만 변경 가능

**기능:**
- 변경사항 실시간 유효성 검사
- 성공/실패 메시지 표시
- Zustand 스토어 자동 업데이트

---

### 2. 🔒 비밀번호 변경
Supabase Auth를 통한 비밀번호 변경

**입력 필드:**
- 새 비밀번호 (최소 6자)
- 새 비밀번호 확인

**유효성 검사:**
- ✅ 비밀번호 최소 길이 확인 (6자 이상)
- ✅ 비밀번호 일치 확인
- ✅ 실시간 에러 메시지

**보안:**
- 현재 비밀번호 불필요 (Supabase가 세션으로 확인)
- 변경 후 자동으로 입력 필드 초기화

---

### 3. ⚠️ 계정 관리 (위험 구역)
계정 영구 삭제 기능

**삭제되는 데이터:**
- 프로필 정보
- 수강 신청 기록 (학생)
- 생성한 강의 및 세션 (강사)
- 채팅 메시지
- 관련된 모든 데이터

**안전 장치:**
- "회원탈퇴" 텍스트 입력 확인
- JavaScript confirm() 다이얼로그
- 삭제 후 자동 로그아웃 및 홈으로 리디렉트

---

## 🔧 기술 구현

### 프론트엔드 (`src/pages/Profile.tsx`)

#### 프로필 정보 수정
```typescript
const handleProfileUpdate = async (e: React.FormEvent) => {
  // 1. Supabase profiles 테이블 업데이트
  const { error } = await supabase
    .from('profiles')
    .update({
      name: name.trim(),
      avatar_url: avatarUrl.trim() || null,
    })
    .eq('id', user?.id)

  // 2. 로컬 상태 업데이트 (Zustand)
  setUser({
    ...user,
    name: name.trim(),
    avatarUrl: avatarUrl.trim() || undefined,
  })
}
```

#### 비밀번호 변경
```typescript
const handlePasswordChange = async (e: React.FormEvent) => {
  // Supabase Auth API 사용
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })
}
```

#### 회원 탈퇴
```typescript
const handleAccountDeletion = async (e: React.FormEvent) => {
  // SQL 함수 호출 (cascade delete)
  const { error } = await supabase.rpc('delete_user')

  // 로그아웃 및 리디렉트
  await logout()
  navigate(ROUTES.HOME)
}
```

---

### 백엔드 (`supabase/migrations/004_profile_management.sql`)

#### 1. 프로필 업데이트 함수

```sql
CREATE OR REPLACE FUNCTION update_profile(
  user_id UUID,
  new_name TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
```

**기능:**
- 사용자 이름 및 아바타 URL 업데이트
- NULL 값은 기존 값 유지 (COALESCE 사용)
- updated_at 자동 갱신
- 업데이트된 프로필을 JSON으로 반환

**사용 예시:**
```sql
-- 이름만 변경
SELECT update_profile(
  'user-uuid',
  '새 이름',
  NULL
);

-- 이름과 아바타 모두 변경
SELECT update_profile(
  'user-uuid',
  '새 이름',
  'https://example.com/avatar.jpg'
);
```

---

#### 2. 회원 탈퇴 함수

```sql
CREATE OR REPLACE FUNCTION delete_user()
RETURNS VOID
```

**기능:**
- 현재 로그인한 사용자의 계정 삭제
- auth.users에서 삭제 → CASCADE로 모든 관련 데이터 삭제
- 인증 확인 (auth.uid() 사용)

**CASCADE 삭제 범위:**
```
auth.users (삭제)
    ↓
public.profiles (CASCADE 삭제)
    ↓
├── enrollments (학생의 수강 신청)
├── courses (강사가 생성한 강의)
│   ↓
│   ├── live_sessions (강의의 세션)
│   └── enrollments (강의의 수강생)
└── chat_messages (사용자의 채팅)
```

**보안:**
- SECURITY DEFINER로 권한 상승
- auth.uid()로 본인만 삭제 가능

**사용 예시:**
```typescript
// 프론트엔드에서 호출
const { error } = await supabase.rpc('delete_user')
```

---

#### 3. 프로필 통계 함수

```sql
CREATE OR REPLACE FUNCTION get_profile_stats(user_id UUID)
RETURNS JSONB
```

**기능:**
- 역할별 통계 정보 반환
- 학생: 수강 신청 수, 완료/진행/중단 강의 수
- 강사: 강의 수, 학생 수, 세션 수
- 관리자: 전체 사용자/강의/수강 신청 통계

**반환 예시:**

학생:
```json
{
  "total_enrollments": 5,
  "active_enrollments": 3,
  "completed_courses": 1,
  "dropped_courses": 1
}
```

강사:
```json
{
  "total_courses": 10,
  "total_students": 156,
  "total_sessions": 25,
  "live_sessions": 2,
  "scheduled_sessions": 8
}
```

관리자:
```json
{
  "total_users": 1000,
  "total_students": 850,
  "total_instructors": 145,
  "total_courses": 500,
  "total_enrollments": 4500
}
```

---

#### 4. 이메일 변경 요청 함수

```sql
CREATE OR REPLACE FUNCTION request_email_change(new_email TEXT)
RETURNS JSONB
```

**기능:**
- 이메일 형식 유효성 검사
- 중복 이메일 확인
- 실제 변경은 Supabase Auth를 통해 진행

**참고:**
이 함수는 유효성 검사만 수행합니다. 실제 이메일 변경은 Supabase Dashboard 또는 Auth API를 통해 이루어집니다.

---

## 📊 데이터베이스 스키마

### profiles 테이블 수정 가능 컬럼

| 컬럼 | 타입 | 수정 가능 | 설명 |
|------|------|----------|------|
| id | UUID | ❌ | Primary Key |
| email | TEXT | ❌ | 이메일 (Auth와 연동) |
| name | TEXT | ✅ | 사용자 이름 |
| role | TEXT | ❌* | 역할 (관리자만 수정 가능) |
| avatar_url | TEXT | ✅ | 프로필 이미지 URL |
| created_at | TIMESTAMPTZ | ❌ | 생성 시각 |
| updated_at | TIMESTAMPTZ | 🤖 | 자동 업데이트 |

*역할 변경은 관리자가 SQL로 직접 변경

---

## 🔒 RLS 정책

### 기존 정책 (002_rls_policies.sql)
```sql
-- 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

### 추가 정책 (004_profile_management.sql)
```sql
-- 아바타 업데이트 정책 (보완)
CREATE POLICY "Users can update own avatar"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

---

## 🧪 테스트 시나리오

### 1. 프로필 정보 수정 테스트

**단계:**
1. 로그인 후 "설정" 클릭
2. "프로필 정보" 탭 선택
3. 이름 변경 후 "변경사항 저장" 클릭
4. 성공 메시지 확인
5. 페이지 새로고침 후 변경사항 유지 확인

**검증:**
```sql
-- 데이터베이스에서 확인
SELECT name, avatar_url, updated_at
FROM public.profiles
WHERE id = 'user-uuid';
```

---

### 2. 비밀번호 변경 테스트

**단계:**
1. "비밀번호 변경" 탭 선택
2. 새 비밀번호 입력 (최소 6자)
3. 비밀번호 확인 입력
4. "비밀번호 변경" 클릭
5. 로그아웃 후 새 비밀번호로 로그인 확인

**검증:**
- 새 비밀번호로 로그인 성공
- 기존 비밀번호로 로그인 실패

---

### 3. 회원 탈퇴 테스트

**단계:**
1. "계정 관리" 탭 선택
2. "회원탈퇴" 텍스트 입력
3. "계정 영구 삭제" 클릭
4. 확인 다이얼로그에서 "확인" 클릭
5. 홈 화면으로 리디렉트 확인
6. 재로그인 시도 → 실패 확인

**검증:**
```sql
-- 사용자 삭제 확인
SELECT * FROM auth.users WHERE id = 'deleted-user-uuid';
-- 결과: 0 rows

-- 프로필 삭제 확인 (CASCADE)
SELECT * FROM public.profiles WHERE id = 'deleted-user-uuid';
-- 결과: 0 rows

-- 관련 데이터 삭제 확인
SELECT * FROM public.enrollments WHERE student_id = 'deleted-user-uuid';
-- 결과: 0 rows
```

---

## ⚠️ 주의사항

### 1. 이메일 변경
- 현재 구현에서는 이메일 변경 불가
- 필요시 Supabase Auth API 사용:
```typescript
const { error } = await supabase.auth.updateUser({
  email: 'new@email.com'
})
// 새 이메일로 확인 메일 전송됨
```

### 2. 역할 변경
- 일반 사용자는 자신의 역할 변경 불가
- 관리자만 SQL로 변경 가능:
```sql
UPDATE public.profiles
SET role = 'instructor'
WHERE id = 'user-uuid';
```

### 3. 회원 탈퇴 복구
- 회원 탈퇴는 **영구적**이며 복구 불가
- 탈퇴 전 중요 데이터 백업 권장
- 소프트 삭제(soft delete)가 필요한 경우 별도 구현 필요

### 4. 프로필 이미지
- 현재는 URL만 저장
- 실제 이미지 업로드 기능은 Supabase Storage 사용 권장:
```typescript
// 이미지 업로드 예시
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${user.id}/avatar.jpg`, file)
```

---

## 🚀 추가 개선 아이디어

### 1. 프로필 이미지 업로드
```typescript
// Supabase Storage 사용
const uploadAvatar = async (file: File) => {
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(`${user.id}/${Date.now()}.jpg`, file)

  if (data) {
    const url = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path).data.publicUrl

    // 프로필 업데이트
    await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user.id)
  }
}
```

### 2. 계정 비활성화 (소프트 삭제)
```sql
-- profiles 테이블에 컬럼 추가
ALTER TABLE public.profiles
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- 비활성화 함수
CREATE OR REPLACE FUNCTION deactivate_account()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET is_active = false
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. 이메일 변경 승인 시스템
```sql
-- 이메일 변경 요청 테이블
CREATE TABLE email_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  new_email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. 프로필 수정 히스토리
```sql
-- 프로필 변경 기록
CREATE TABLE profile_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📝 SQL 쿼리 모음

### 프로필 조회
```sql
-- 특정 사용자 프로필
SELECT * FROM public.profiles WHERE id = 'user-uuid';

-- 모든 활성 사용자
SELECT id, name, email, role
FROM public.profiles
ORDER BY created_at DESC;
```

### 프로필 수정
```sql
-- 이름 변경
UPDATE public.profiles
SET name = '새 이름'
WHERE id = 'user-uuid';

-- 아바타 변경
UPDATE public.profiles
SET avatar_url = 'https://example.com/avatar.jpg'
WHERE id = 'user-uuid';

-- 여러 필드 동시 변경
UPDATE public.profiles
SET
  name = '새 이름',
  avatar_url = 'https://example.com/avatar.jpg',
  updated_at = NOW()
WHERE id = 'user-uuid';
```

### 통계 조회
```sql
-- 사용자별 통계
SELECT get_profile_stats('user-uuid');

-- 전체 사용자 수
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE role = 'student') as students,
  COUNT(*) FILTER (WHERE role = 'instructor') as instructors,
  COUNT(*) FILTER (WHERE role = 'admin') as admins
FROM public.profiles;
```

### 회원 탈퇴 관련
```sql
-- 사용자 삭제 (CASCADE)
DELETE FROM auth.users WHERE id = 'user-uuid';

-- 삭제 예정 사용자 확인
SELECT p.*, COUNT(e.id) as enrollment_count
FROM public.profiles p
LEFT JOIN public.enrollments e ON e.student_id = p.id
WHERE p.id = 'user-uuid'
GROUP BY p.id;
```

---

## 🔗 관련 문서

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Supabase Storage 문서](https://supabase.com/docs/guides/storage)
- [ROLE_BASED_AUTH.md](./ROLE_BASED_AUTH.md) - 역할 기반 인증
- [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) - Supabase 설정
