# Supabase VSCode 확장 연동 가이드

VSCode의 Supabase 확장 프로그램을 사용하여 프로젝트를 관리하는 방법입니다.

## 전제 조건

- VSCode에 Supabase 확장 설치 완료
- Supabase 프로젝트 생성 완료 ([SUPABASE_SETUP.md](SUPABASE_SETUP.md) 참고)

## 1. Supabase CLI 설치

### Windows (권장)
PowerShell에서 Scoop 사용:
```powershell
scoop install supabase
```

또는 npm으로 설치:
```bash
npm install -g supabase
```

### 설치 확인
```bash
supabase --version
```

## 2. Supabase 프로젝트 연결

### 2.1 Supabase에 로그인
```bash
supabase login
```
브라우저가 열리면 로그인하고 액세스 토큰을 허용합니다.

### 2.2 프로젝트 연결
프로젝트 루트 디렉토리에서:
```bash
supabase link --project-ref your-project-ref
```

**프로젝트 Reference ID 찾기:**
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. Settings > General > Reference ID 복사

### 2.3 config.toml 업데이트
[supabase/config.toml](supabase/config.toml) 파일에서 `project_id`를 실제 프로젝트 ID로 변경:
```toml
[project]
project_id = "your-actual-project-id"
```

## 3. VSCode Supabase 확장 사용법

### 3.1 확장 프로그램 활성화
- VSCode 좌측 사이드바에 Supabase 아이콘이 나타납니다
- 클릭하면 프로젝트 정보를 확인할 수 있습니다

### 3.2 주요 기능
1. **Database 브라우저**: 테이블, 뷰, 함수 탐색
2. **SQL 에디터**: 직접 쿼리 실행
3. **마이그레이션 관리**: 새 마이그레이션 생성/적용
4. **로컬 개발**: 로컬 Supabase 인스턴스 시작

## 4. 로컬 개발 환경 설정

### 4.1 Docker 설치 필요
Supabase 로컬 개발은 Docker를 사용합니다:
- [Docker Desktop 다운로드](https://www.docker.com/products/docker-desktop/)

### 4.2 로컬 Supabase 시작
```bash
supabase start
```

처음 실행 시 필요한 Docker 이미지를 다운로드합니다 (시간이 걸릴 수 있음).

실행 후 다음 정보가 표시됩니다:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Anon key: eyJh...
Service Role key: eyJh...
```

### 4.3 로컬 환경 변수 설정
`.env` 파일에 로컬 개발용 환경 변수 추가:
```env
# 로컬 개발용 (supabase start 실행 시 사용)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<supabase start에서 출력된 Anon key>

SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=<supabase start에서 출력된 Service Role key>
```

### 4.4 로컬 Supabase 중지
```bash
supabase stop
```

## 5. 마이그레이션 관리

### 5.1 기존 마이그레이션 적용
로컬 데이터베이스에 현재 마이그레이션 적용:
```bash
supabase db reset
```

### 5.2 새 마이그레이션 생성
```bash
supabase migration new <migration-name>
```

생성된 파일(`supabase/migrations/`)을 편집하여 SQL 작성.

### 5.3 원격 데이터베이스에 적용
```bash
supabase db push
```

### 5.4 원격에서 로컬로 마이그레이션 가져오기
```bash
supabase db pull
```

## 6. VSCode 확장 주요 명령어

VSCode 명령 팔레트(`Ctrl+Shift+P` 또는 `Cmd+Shift+P`)에서:

- `Supabase: Start` - 로컬 Supabase 시작
- `Supabase: Stop` - 로컬 Supabase 중지
- `Supabase: New Migration` - 새 마이그레이션 생성
- `Supabase: Reset Database` - 로컬 DB 초기화
- `Supabase: Generate Types` - TypeScript 타입 생성

## 7. 유용한 팁

### 7.1 TypeScript 타입 자동 생성
로컬 스키마 기반으로 타입 생성:
```bash
supabase gen types typescript --local > src/types/database.types.ts
```

원격 프로젝트 기반:
```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

### 7.2 Supabase Studio 사용
로컬 Supabase 실행 후 브라우저에서 `http://localhost:54323` 접속하면 GUI로 데이터베이스 관리 가능.

### 7.3 프로덕션 vs 로컬 전환
`.env` 파일에서 환경 변수만 변경하면 됩니다:
- 프로덕션: `VITE_SUPABASE_URL=https://your-project.supabase.co`
- 로컬: `VITE_SUPABASE_URL=http://localhost:54321`

### 7.4 데이터베이스 스키마 비교
로컬과 원격의 스키마 차이 확인:
```bash
supabase db diff
```

## 8. 개발 워크플로우 예시

### 프로덕션 데이터베이스로 개발
```bash
# 1. 원격 프로젝트 연결
supabase link --project-ref your-project-ref

# 2. 앱 실행 (프로덕션 DB 사용)
npm run dev:both
```

### 로컬 데이터베이스로 개발
```bash
# 1. 로컬 Supabase 시작
supabase start

# 2. 환경 변수를 로컬로 변경 (.env 파일)
# VITE_SUPABASE_URL=http://localhost:54321

# 3. 마이그레이션 적용
supabase db reset

# 4. 앱 실행 (로컬 DB 사용)
npm run dev:both

# 5. 작업 완료 후 로컬 DB 중지
supabase stop
```

### 새 기능 개발 시
```bash
# 1. 로컬 환경에서 개발
supabase start

# 2. 새 마이그레이션 생성
supabase migration new add_course_materials

# 3. SQL 작성 (supabase/migrations/xxx_add_course_materials.sql)

# 4. 로컬 DB에 적용
supabase db reset

# 5. 테스트

# 6. 원격 DB에 적용
supabase db push
```

## 9. 문제 해결

### 포트 충돌
다른 서비스가 포트를 사용 중이면 [supabase/config.toml](supabase/config.toml)에서 포트 변경:
```toml
[api]
port = 54321  # 다른 포트로 변경

[db]
port = 54322  # 다른 포트로 변경
```

### Docker 문제
```bash
# Docker 컨테이너 확인
docker ps

# Supabase 컨테이너 재시작
supabase stop
supabase start
```

### 마이그레이션 충돌
```bash
# 로컬 DB 완전 초기화
supabase db reset
```

### "Project is not linked" 오류
```bash
# 프로젝트 재연결
supabase link --project-ref your-project-ref
```

### TypeScript 타입 생성 오류
```bash
# 로컬 Supabase가 실행 중인지 확인
supabase status

# 실행 중이 아니면 시작
supabase start
```

## 10. VSCode에서 SQL 실행하기

### 방법 1: SQL 파일에서 직접 실행
1. `.sql` 파일 열기
2. SQL 쿼리 선택
3. 우클릭 > "Supabase: Run SQL"

### 방법 2: Command Palette
1. `Ctrl+Shift+P`
2. "Supabase: Run SQL" 선택
3. 쿼리 입력 후 실행

### 방법 3: Supabase Studio
1. 로컬 Supabase 실행 중이어야 함
2. `http://localhost:54323` 접속
3. SQL Editor에서 쿼리 작성 및 실행

## 11. 환경 분리 전략

### 개발 환경별 .env 파일 사용
```bash
# .env.development (로컬 DB)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<로컬 anon key>

# .env.production (프로덕션 DB)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<프로덕션 anon key>
```

### 스크립트로 환경 전환
`package.json`에 추가:
```json
{
  "scripts": {
    "dev:local": "supabase start && vite --mode development",
    "dev:prod": "vite --mode production"
  }
}
```

## 참고 문서
- [Supabase CLI 공식 문서](https://supabase.com/docs/guides/cli)
- [로컬 개발 가이드](https://supabase.com/docs/guides/cli/local-development)
- [VSCode 확장 문서](https://github.com/supabase/supabase-vscode)
- [Supabase 프로젝트 설정](SUPABASE_SETUP.md)
