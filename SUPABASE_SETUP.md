# Supabase 설정 가이드

VerseUp 프로젝트를 위한 Supabase 데이터베이스 설정 가이드입니다.

## 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "Start your project" 클릭
3. 새 Organization 생성 (또는 기존 Organization 선택)
4. "New Project" 클릭
5. 프로젝트 정보 입력:
   - **Name**: VerseUp (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정 (저장 필수!)
   - **Region**: South Korea (Seoul) 선택 (가장 가까운 리전)
6. "Create new project" 클릭 (약 2분 소요)

## 2. 데이터베이스 마이그레이션 실행

프로젝트가 생성되면 데이터베이스 테이블을 생성해야 합니다.

### SQL 실행 방법:

1. Supabase 대시보드에서 **SQL Editor** 선택 (왼쪽 메뉴)
2. "New query" 클릭
3. 다음 순서대로 SQL 파일 내용을 복사해서 실행:

#### Step 1: 테이블 생성 (필수)
`supabase/migrations/001_initial_schema.sql` 파일 내용 복사 → 붙여넣기 → "Run" 클릭

**포함 내용:**
- ✅ profiles, courses, enrollments, live_sessions, chat_messages 테이블
- ✅ 역할(role) 컬럼 및 제약조건 (student/instructor/admin)
- ✅ 자동 프로필 생성 트리거 (회원가입 시 role 자동 설정)
- ✅ 수강생 수 자동 계산 트리거

#### Step 2: RLS 정책 설정 (필수)
`supabase/migrations/002_rls_policies.sql` 파일 내용 복사 → 붙여넣기 → "Run" 클릭

**포함 내용:**
- ✅ 학생: 수강 신청만 가능
- ✅ 강사: 강의 생성/관리, 자신의 강의 세션 관리
- ✅ 관리자: 모든 데이터 접근 및 관리
- ✅ 역할 기반 데이터 접근 제어

#### Step 3: 추가 개선사항 (선택사항)
`supabase/migrations/003_improvements.sql` 파일 내용 복사 → 붙여넣기 → "Run" 클릭

**포함 내용:**
- ✅ 성능 최적화 인덱스
- ✅ 역할 확인 헬퍼 함수 (is_instructor_or_admin, get_user_role)
- ✅ 수강 정원 자동 체크 (정원 초과 방지)
- ✅ 역할 권한 상승 방지 (일반 사용자가 스스로 admin이 되는 것 방지)
- ✅ 감사 로그 (역할 변경 추적)
- ✅ 유용한 뷰 (course_statistics, user_enrollment_summary)

### 생성되는 테이블:
- ✅ **profiles** - 사용자 프로필 정보
- ✅ **courses** - 강의 정보
- ✅ **enrollments** - 수강 신청 정보
- ✅ **live_sessions** - 라이브 세션 정보
- ✅ **chat_messages** - 채팅 메시지

## 3. Google OAuth 설정 (선택사항)

Google 로그인을 사용하려면 추가 설정이 필요합니다.

1. Supabase 대시보드에서 **Authentication** → **Providers** 선택
2. **Google** 찾아서 클릭
3. "Enable Google" 토글 켜기
4. Google Cloud Console 설정:
   - [Google Cloud Console](https://console.cloud.google.com/) 접속
   - 새 프로젝트 생성 또는 기존 프로젝트 선택
   - "APIs & Services" → "Credentials" 이동
   - "Create Credentials" → "OAuth 2.0 Client ID" 선택
   - Application type: "Web application"
   - Authorized redirect URIs에 Supabase에서 제공하는 URL 추가
     - 예: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
5. 생성된 **Client ID**와 **Client Secret**을 Supabase에 입력
6. "Save" 클릭

## 4. 환경 변수 설정

### API 키 가져오기:

1. Supabase 대시보드에서 **Settings** → **API** 선택
2. 다음 값들을 복사:
   - **Project URL**: `https://[YOUR-PROJECT-REF].supabase.co`
   - **anon public**: `eyJhbGc...` (공개 키)
   - **service_role**: `eyJhbGc...` (비밀 키, 서버용)

### .env 파일 설정:

프로젝트 루트의 `.env` 파일을 열고 다음 값을 설정:

```bash
# Frontend (VITE_ prefix)
VITE_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (anon public 키)

# Backend
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service_role 키)

# Other settings (이미 설정되어 있음)
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-jwt-secret-key
```

## 5. 데이터베이스 확인

설정이 완료되었는지 확인:

1. **Table Editor** 메뉴로 이동
2. 다음 테이블들이 보이는지 확인:
   - profiles
   - courses
   - enrollments
   - live_sessions
   - chat_messages

## 6. 테스트

### 회원가입 테스트:
1. 애플리케이션 실행: `npm run dev:both`
2. http://localhost:5173/register 접속
3. **역할 선택**: 학생(🎓) 또는 강사(👨‍🏫) 선택
4. 이메일/비밀번호로 회원가입
5. 이메일 확인 (Supabase는 기본적으로 이메일 확인 요구)
6. 로그인 성공 확인

### 이메일 확인 비활성화 (개발 중):
개발 중에는 이메일 확인을 비활성화할 수 있습니다:
1. **Authentication** → **Providers** → **Email**
2. "Confirm email" 토글 끄기
3. "Save" 클릭

## 7. 데이터베이스 스키마 구조

```
auth.users (Supabase 자동 관리)
    ↓
public.profiles (사용자 프로필)
    ├── id (UUID, auth.users.id 참조)
    ├── email
    ├── name
    ├── role (student/instructor/admin)
    ├── avatar_url
    └── timestamps

public.courses (강의)
    ├── id (UUID)
    ├── title
    ├── description
    ├── instructor_id → profiles.id
    ├── max_students
    ├── enrolled_count (자동 계산)
    └── dates & timestamps

public.enrollments (수강 신청)
    ├── course_id → courses.id
    ├── student_id → profiles.id
    └── status (active/completed/dropped)

public.live_sessions (라이브 세션)
    ├── course_id → courses.id
    ├── title, description
    ├── scheduled_at, duration
    └── status (scheduled/live/ended)

public.chat_messages (채팅)
    ├── session_id → live_sessions.id
    ├── user_id → profiles.id
    ├── message
    └── type (text/system)
```

## 8. Row Level Security (RLS) 정책

보안을 위해 다음 역할 기반 정책들이 적용되어 있습니다:

### 역할 구분:
- **학생 (student)**: 강의 수강, 채팅 참여
- **강사 (instructor)**: 강의 생성/관리, 라이브 세션 관리
- **관리자 (admin)**: 모든 데이터 접근 및 관리 (회원가입 시 선택 불가, 직접 DB에서 설정)

### RLS 정책:
- ✅ **Profiles**: 모든 사용자가 조회 가능, 본인만 수정 가능
- ✅ **Courses**: 모든 사용자가 조회 가능, 강사/관리자만 생성/수정/삭제
- ✅ **Enrollments**: 학생만 수강신청 가능, 본인 또는 강사가 조회 가능
- ✅ **Live Sessions**: 모든 사용자가 조회 가능, 해당 강의 강사만 관리
- ✅ **Chat Messages**: 수강생과 강사만 조회 가능, 본인만 삭제 가능

### 관리자 역할 부여 방법:
특정 사용자를 관리자로 설정하려면 Supabase SQL Editor에서:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

## 9. 자동화된 기능

다음 기능들이 자동으로 실행됩니다:

- ✅ **자동 프로필 생성**: 회원가입 시 profiles 테이블에 자동 추가
- ✅ **자동 수강생 수 계산**: 수강신청/취소 시 enrolled_count 자동 업데이트
- ✅ **자동 타임스탬프**: updated_at 자동 업데이트

## 문제 해결

### "relation does not exist" 오류
→ SQL 마이그레이션이 제대로 실행되지 않았습니다. Step 2를 다시 확인하세요.

### Google 로그인이 작동하지 않음
→ Google OAuth 설정을 확인하고, Redirect URI가 정확한지 확인하세요.

### 회원가입 후 이메일이 오지 않음
→ 개발 중에는 이메일 확인을 비활성화하거나, Supabase 대시보드에서 직접 확인할 수 있습니다.

### RLS 정책 오류
→ Authentication → Policies에서 정책이 제대로 적용되었는지 확인하세요.

## 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase Auth 가이드](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
