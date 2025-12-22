# 배포 가이드

> VerseUp 프로젝트 배포 방법

**최종 업데이트**: 2024-12-22

---

## 목차

1. [사전 요구사항](#1-사전-요구사항)
2. [Render 배포](#2-render-배포)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [Supabase 설정](#4-supabase-설정)
5. [배포 후 확인사항](#5-배포-후-확인사항)
6. [문제 해결](#6-문제-해결)

---

## 1. 사전 요구사항

### 필수 계정
- [GitHub](https://github.com) - 코드 저장소
- [Render](https://render.com) - 호스팅
- [Supabase](https://supabase.com) - 데이터베이스 & 인증
- [Toss Payments](https://developers.tosspayments.com) - 결제 (선택)

### 로컬 테스트
배포 전 로컬에서 프로덕션 빌드 테스트:

```bash
# 빌드
npm run build

# 프로덕션 모드로 서버 실행
NODE_ENV=production npm start
```

---

## 2. Render 배포

### 2.1 새 Web Service 생성

1. [Render Dashboard](https://dashboard.render.com) 접속
2. **New +** → **Web Service** 클릭
3. GitHub 저장소 연결 및 선택

### 2.2 서비스 설정

| 설정 | 값 |
|------|-----|
| Name | `verseup` (원하는 이름) |
| Region | Singapore (가까운 지역) |
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Plan | Free 또는 원하는 플랜 |

### 2.3 Auto-Deploy
- **Auto-Deploy**: Yes (main 브랜치 푸시 시 자동 배포)

### 2.4 배포 시작
**Create Web Service** 클릭 후 배포 로그 확인

---

## 3. 환경 변수 설정

Render Dashboard → 서비스 → **Environment** 탭

### 필수 환경 변수

```bash
# 서버 설정
NODE_ENV=production
CORS_ORIGIN=https://verseup.onrender.com

# Supabase (Supabase 대시보드에서 복사)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# JWT 시크릿 (랜덤 문자열 생성)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# 프론트엔드 환경 변수 (빌드 시 주입)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_URL=https://verseup.onrender.com
VITE_SOCKET_URL=https://verseup.onrender.com
```

### 결제 연동 시 (선택)

```bash
VITE_TOSS_CLIENT_KEY=live_ck_...
TOSS_SECRET_KEY=live_sk_...
```

### 환경 변수 생성 팁

**JWT_SECRET 생성**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Supabase 설정

### 4.1 프로젝트 생성
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. **New Project** 생성
3. 데이터베이스 비밀번호 기록

### 4.2 데이터베이스 마이그레이션

**Option A: SQL Editor 사용**
1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/` 폴더의 SQL 파일들을 순서대로 실행

**Option B: Supabase CLI 사용**
```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 4.3 API 키 확인
Supabase Dashboard → Settings → API

- **URL**: `SUPABASE_URL`, `VITE_SUPABASE_URL`
- **anon public**: `VITE_SUPABASE_ANON_KEY`
- **service_role**: `SUPABASE_SERVICE_KEY` (비밀!)

### 4.4 인증 설정
1. Authentication → Providers
2. Email 활성화
3. Site URL 설정: `https://verseup.onrender.com`
4. Redirect URLs 추가: `https://verseup.onrender.com/*`

---

## 5. 배포 후 확인사항

### 5.1 헬스 체크
```bash
curl https://verseup.onrender.com/health
```

예상 응답:
```json
{"status":"ok","timestamp":"2024-12-22T00:00:00.000Z"}
```

### 5.2 기능 테스트 체크리스트

- [ ] 메인 페이지 로드
- [ ] 회원가입/로그인
- [ ] 강의 목록 조회
- [ ] 메타버스 입장 (`/metaverse`)
- [ ] 멀티플레이어 (두 브라우저에서 접속)
- [ ] Socket.IO 연결 (개발자 도구 Network → WS)
- [ ] 화면 공유 (강사 모드)
- [ ] 채팅

### 5.3 로그 확인
Render Dashboard → 서비스 → **Logs** 탭

---

## 6. 문제 해결

### 6.1 빌드 실패

**에러**: `npm ERR! missing script: build`
**해결**: package.json에 build 스크립트 확인
```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

---

### 6.2 서버 시작 실패

**에러**: `Missing required environment variables`
**해결**: Render 환경 변수에 필수 값 설정 확인
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- JWT_SECRET

---

### 6.3 CORS 에러

**에러**: `Access to XMLHttpRequest blocked by CORS policy`
**해결**:
1. `CORS_ORIGIN` 환경 변수가 정확한 URL인지 확인
2. `https://` 포함 여부 확인
3. 끝에 `/` 없어야 함

---

### 6.4 Socket.IO 연결 실패

**증상**: 실시간 기능 작동 안 함
**확인사항**:
1. `VITE_SOCKET_URL`이 백엔드 URL과 일치하는지
2. WebSocket이 Render에서 지원되는지 (Free 플랜 지원)
3. 브라우저 개발자 도구 → Network → WS 탭 확인

---

### 6.5 메타버스 3D 로딩 실패

**증상**: 3D 모델 로드 안 됨
**확인사항**:
1. `public/models/` 폴더가 빌드에 포함되었는지
2. 모델 파일 크기 (Render Free 플랜 제한)
3. 브라우저 콘솔에서 404 에러 확인

---

### 6.6 데이터베이스 연결 실패

**에러**: `Database service unavailable`
**확인사항**:
1. `SUPABASE_URL`이 올바른지
2. `SUPABASE_SERVICE_KEY`가 올바른지 (anon key 아님!)
3. Supabase 프로젝트가 활성 상태인지

---

## render.yaml 참조

프로젝트 루트의 `render.yaml` 파일:

```yaml
services:
  - type: web
    name: verseup-server
    runtime: node
    plan: free
    buildCommand: npm install && npm run build:client
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: CORS_ORIGIN
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
      - key: VITE_API_URL
        sync: false
      - key: VITE_SOCKET_URL
        sync: false
    healthCheckPath: /health
    autoDeploy: true
```

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|-----------|--------|
| 2024-12-22 | 초기 배포 가이드 작성 | Claude |

