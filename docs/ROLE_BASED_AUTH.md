# 역할 기반 인증 시스템

VerseUp의 역할 기반 인증 및 권한 관리 시스템에 대한 문서입니다.

## 역할 (Roles)

시스템에는 3가지 역할이 있습니다:

### 1. 학생 (Student) 🎓
**권한:**
- 강의 목록 조회
- 강의 수강 신청
- 수강 중인 강의의 라이브 세션 참여
- 채팅 메시지 전송
- 본인 프로필 수정

**제한:**
- 강의 생성/수정/삭제 불가
- 다른 학생의 수강 정보 조회 불가

### 2. 강사 (Instructor) 👨‍🏫
**권한:**
- 학생의 모든 권한 포함
- 강의 생성/수정/삭제
- 자신의 강의에 대한 라이브 세션 관리
- 자신의 강의에 수강 신청한 학생 목록 조회
- 자신의 강의 채팅 메시지 관리

**제한:**
- 다른 강사의 강의 수정/삭제 불가

### 3. 관리자 (Admin) 👑
**권한:**
- 모든 데이터에 대한 완전한 접근 권한
- 모든 강의 수정/삭제
- 모든 사용자 정보 조회
- 모든 채팅 메시지 관리
- 역할 변경 권한

**참고:** 관리자 역할은 회원가입 시 선택할 수 없으며, 데이터베이스에서 직접 설정해야 합니다.

## 회원가입 프로세스

### 1. 역할 선택
회원가입 페이지(`/register`)에서 사용자는 다음 중 하나를 선택합니다:
- 🎓 **학생**: 강의를 수강하려는 사용자
- 👨‍🏫 **강사**: 강의를 제공하려는 사용자

### 2. 데이터 흐름
```
사용자 입력 (이름, 이메일, 비밀번호, 역할)
    ↓
Supabase Auth.signUp() - user_metadata에 role 저장
    ↓
Database Trigger: handle_new_user()
    ↓
profiles 테이블에 자동으로 프로필 생성 (role 포함)
    ↓
회원가입 완료
```

### 3. 코드 예시

**프론트엔드 (Register.tsx):**
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name,
      role, // 'student' 또는 'instructor'
    },
  },
})
```

**데이터베이스 트리거:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 로그인 프로세스

### 데이터 흐름
```
이메일/비밀번호 입력
    ↓
Supabase Auth.signInWithPassword()
    ↓
Session 생성 (user_metadata에서 role 가져오기)
    ↓
Zustand 스토어에 사용자 정보 저장
    ↓
로그인 완료 → Dashboard로 리디렉트
```

### OAuth (Google) 로그인
```
Google OAuth 버튼 클릭
    ↓
Supabase Auth.signInWithOAuth()
    ↓
Google 인증 페이지
    ↓
인증 완료 후 Dashboard로 리디렉트
    ↓
Note: OAuth 최초 로그인 시 기본 역할은 'student'
```

## Row Level Security (RLS) 정책

### Profiles 테이블
```sql
-- 모든 사용자가 프로필 조회 가능
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- 본인만 프로필 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

### Courses 테이블
```sql
-- 강사와 관리자만 강의 생성 가능
CREATE POLICY "Instructors and admins can create courses"
  ON public.courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('instructor', 'admin')
    )
  );

-- 강사는 자신의 강의만, 관리자는 모든 강의 수정 가능
CREATE POLICY "Instructors can update own courses"
  ON public.courses FOR UPDATE
  USING (
    instructor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Enrollments 테이블
```sql
-- 학생만 수강 신청 가능
CREATE POLICY "Students can enroll in courses"
  ON public.enrollments FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );
```

## 관리자 역할 부여

관리자는 보안상의 이유로 회원가입 시 선택할 수 없습니다. 다음 방법으로 관리자를 지정하세요:

### 방법 1: Supabase SQL Editor
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

### 방법 2: Supabase Table Editor
1. Supabase 대시보드 → Table Editor → profiles
2. 해당 사용자 찾기
3. role 컬럼을 'admin'으로 변경
4. 저장

## 백엔드 인증

서버에서는 JWT 토큰을 검증하고 profiles 테이블에서 역할 정보를 가져옵니다:

```typescript
// server/middleware/auth.ts
export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization.substring(7)
  const user = await verifySupabaseToken(token)

  // profiles 테이블에서 역할 정보 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  req.user = {
    id: user.id,
    email: user.email,
    role: profile.role,
  }

  next()
}
```

## 권한 확인 예시

### 프론트엔드
```typescript
import { useAuthStore } from '@/stores/authStore'

function CreateCourseButton() {
  const { user } = useAuthStore()

  // 강사와 관리자만 버튼 표시
  if (!user || !['instructor', 'admin'].includes(user.role)) {
    return null
  }

  return <button>강의 생성</button>
}
```

### 백엔드
```typescript
router.post('/courses', authMiddleware, async (req, res) => {
  // 역할 확인
  if (!['instructor', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // 강의 생성 로직...
})
```

## 보안 고려사항

1. **클라이언트 검증은 UX용**: 프론트엔드의 역할 확인은 UI/UX 개선용이며, 실제 보안은 RLS 정책과 백엔드에서 처리
2. **RLS는 필수**: 모든 테이블에 RLS를 활성화하고 적절한 정책 적용
3. **역할은 profiles에 저장**: user_metadata는 참고용이며, 실제 역할은 profiles 테이블 사용
4. **관리자 역할은 제한적**: 관리자는 직접 데이터베이스에서 설정하여 무분별한 권한 상승 방지

## 역할 변경

### 사용자 역할 변경 (관리자만)
```sql
-- 학생을 강사로 변경
UPDATE public.profiles
SET role = 'instructor'
WHERE id = 'user-uuid-here';

-- 강사를 학생으로 변경
UPDATE public.profiles
SET role = 'student'
WHERE id = 'user-uuid-here';
```

**참고:** 역할 변경 후 사용자는 재로그인해야 새로운 권한이 적용됩니다.

## 테스트

### 학생 계정 테스트
1. `/register`에서 학생(🎓) 선택
2. 회원가입 후 로그인
3. 강의 목록 조회 가능 확인
4. 강의 생성 버튼이 보이지 않는지 확인

### 강사 계정 테스트
1. `/register`에서 강사(👨‍🏫) 선택
2. 회원가입 후 로그인
3. 강의 생성 버튼이 표시되는지 확인
4. 강의 생성 기능 테스트

### 관리자 계정 테스트
1. SQL로 관리자 역할 부여
2. 재로그인
3. 모든 강의 수정/삭제 가능한지 확인
