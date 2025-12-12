# 관리자 계정 생성 가이드

## 계정 정보
- **이메일**: admin@test.com
- **비밀번호**: test1234
- **역할**: admin

## 방법 1: 웹 UI + SQL (권장)

### 단계 1: 회원가입
1. 서버 실행: `npm run dev:both`
2. 브라우저에서 http://localhost:5173 접속
3. 회원가입 페이지로 이동
4. 다음 정보로 회원가입:
   - 이름: Admin User
   - 이메일: admin@test.com
   - 비밀번호: test1234
   - 비밀번호 확인: test1234

### 단계 2: Role을 Admin으로 변경
1. Supabase Dashboard 접속
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. 왼쪽 메뉴에서 **SQL Editor** 클릭

3. 새 쿼리 작성 또는 아래 SQL 실행:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@test.com';

-- 확인
SELECT id, email, name, role, created_at
FROM profiles
WHERE email = 'admin@test.com';
```

4. **Run** 버튼 클릭하여 실행

5. 결과 확인:
   - role이 'admin'으로 변경되었는지 확인

### 단계 3: 로그인 테스트
1. 웹 UI에서 로그아웃 (이미 로그인된 경우)
2. admin@test.com / test1234로 로그인
3. 자동으로 `/dashboard`로 이동하면 관리자 대시보드가 표시됨

---

## 방법 2: Supabase Dashboard에서 직접 생성

### 단계 1: Authentication에서 사용자 생성
1. Supabase Dashboard 접속
2. 왼쪽 메뉴에서 **Authentication** > **Users** 클릭
3. **Add user** 버튼 클릭
4. 정보 입력:
   - Email: admin@test.com
   - Password: test1234
   - Auto Confirm User: 체크 (이메일 인증 생략)
5. **Create user** 클릭

### 단계 2: profiles 테이블에 데이터 추가
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. 새 쿼리 작성:

```sql
-- 방금 생성한 사용자의 ID 확인
SELECT id, email, created_at
FROM auth.users
WHERE email = 'admin@test.com';

-- profiles 테이블에 데이터 삽입 (ID는 위에서 확인한 ID 사용)
INSERT INTO profiles (id, email, name, role, created_at, updated_at)
SELECT
  id,
  email,
  'Admin User' as name,
  'admin' as role,
  created_at,
  created_at as updated_at
FROM auth.users
WHERE email = 'admin@test.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- 최종 확인
SELECT id, email, name, role, created_at
FROM profiles
WHERE email = 'admin@test.com';
```

3. **Run** 버튼 클릭

### 단계 3: 로그인 테스트
- admin@test.com / test1234로 로그인

---

## 방법 3: Supabase CLI 사용 (로컬 개발 환경)

```bash
# Supabase 로컬 시작 (이미 시작된 경우 생략)
npm run supabase:start

# SQL 실행
npx supabase db execute --file docs/create_admin_account.sql
```

---

## 문제 해결

### 로그인 후 관리자 페이지가 보이지 않는 경우

1. **브라우저 콘솔 확인**:
   - F12 → Console 탭
   - user 객체의 role 확인

2. **로컬 스토리지 초기화**:
   ```javascript
   // 브라우저 콘솔에서 실행
   localStorage.clear()
   // 페이지 새로고침 후 다시 로그인
   ```

3. **profiles 테이블 확인**:
   ```sql
   SELECT * FROM profiles WHERE email = 'admin@test.com';
   ```
   - role이 'admin'인지 확인

4. **auth.users의 user_metadata 확인**:
   ```sql
   SELECT id, email, raw_user_meta_data
   FROM auth.users
   WHERE email = 'admin@test.com';
   ```

### Forbidden(403) 페이지가 표시되는 경우
- role이 제대로 설정되지 않았음
- 위의 SQL로 role 업데이트 후 재로그인

---

## 참고사항

- 관리자 권한은 profiles 테이블의 `role` 컬럼으로 관리됩니다.
- 현재 role 종류: `student`, `instructor`, `admin`
- 관리자는 모든 페이지와 API에 접근 가능합니다.
- 추가 관리자를 만들려면 동일한 방법으로 role을 'admin'으로 설정하면 됩니다.

---

**작성일**: 2025-12-12
