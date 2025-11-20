# VerseUp!

편하게 놀고 소통하는 웹 메타버스 학습 플랫폼

## 기술 스택

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Routing**: React Router
- **Real-time**: Socket.IO Client
- **Animation**: Framer Motion
- **3D Graphics**: Three.js, React Three Fiber

### Backend
- **Runtime**: Node.js, Express
- **Real-time**: Socket.IO
- **Database**: Supabase
- **Auth**: JWT

## 시작하기

### 필수 요구사항

- Node.js 18+
- npm

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 필요한 환경 변수를 설정하세요
```

### 개발 서버 실행

```bash
# 프론트엔드만 실행 (포트 5173)
npm run dev

# 백엔드만 실행 (포트 3000)
npm run dev:server

# 프론트엔드 + 백엔드 동시 실행 (권장)
npm run dev:both
```

개발 서버:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

### 빌드

```bash
# 전체 빌드 (프론트 + 백엔드)
npm run build

# 프론트엔드만 빌드
npm run build:client

# 백엔드만 빌드
npm run build:server
```

### 프로덕션 실행

```bash
npm start
```

## 프로젝트 구조

```
verseUp/
├── src/               # React 프론트엔드
│   ├── components/    # 재사용 가능한 UI 컴포넌트
│   │   ├── layout/   # 레이아웃 컴포넌트
│   │   └── ui/       # UI 컴포넌트
│   ├── pages/        # 페이지 컴포넌트
│   ├── stores/       # Zustand 상태 관리
│   ├── services/     # API 및 외부 서비스
│   ├── types/        # TypeScript 타입 정의
│   └── utils/        # 유틸리티 함수
│
├── server/           # Express 백엔드
│   ├── routes/       # API 라우트
│   ├── sockets/      # Socket.IO 핸들러
│   ├── middleware/   # Express 미들웨어
│   ├── types/        # TypeScript 타입 정의
│   └── utils/        # 유틸리티 함수
│
├── public/           # 정적 파일
└── dist/             # 빌드 출력
```

## 주요 기능

- 사용자 인증 (로그인/회원가입)
- 강의 탐색 및 검색
- 실시간 강의실 (WebRTC)
- 3D 아바타 커스터마이즈
- 실시간 채팅 및 협업
- 과제 및 자료 관리
- 대시보드

## 환경 변수

### 프론트엔드 (VITE_ 접두사)
- `VITE_API_URL`: 백엔드 API URL (기본값: http://localhost:3000)
- `VITE_SOCKET_URL`: Socket.IO 서버 URL (기본값: http://localhost:3000)
- `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Anonymous Key

### 백엔드
- `PORT`: 서버 포트 (기본값: 3000)
- `NODE_ENV`: 환경 (development/production)
- `CORS_ORIGIN`: CORS 허용 오리진 (기본값: http://localhost:5173)
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_KEY`: Supabase Service Role Key
- `JWT_SECRET`: JWT 시크릿 키

## 개발 가이드

### 코드 스타일

프로젝트는 ESLint와 Prettier를 사용합니다.

```bash
# 린트 실행
npm run lint

# 코드 포맷팅
npm run format
```

### API 프록시

개발 모드에서 Vite는 `/api`와 `/socket.io` 요청을 백엔드 서버(포트 3000)로 프록시합니다.

### Git 브랜치 전략

- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치

## 라이선스

MIT
