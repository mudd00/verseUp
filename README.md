# VerseUp! - Frontend

편하게 놀고 소통하는 웹 메타버스 학습 플랫폼

## 기술 스택

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Routing**: React Router
- **Real-time**: Socket.IO Client
- **Backend**: Supabase
- **Animation**: Framer Motion

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
npm run dev
```

개발 서버가 `http://localhost:5173`에서 실행됩니다.

### 빌드

```bash
npm run build
```

### 프리뷰

```bash
npm run preview
```

## 프로젝트 구조

```
src/
├── components/     # 재사용 가능한 UI 컴포넌트
│   ├── layout/    # 레이아웃 컴포넌트 (Header, Footer 등)
│   └── ui/        # UI 컴포넌트 (Button, Input 등)
├── pages/         # 페이지 컴포넌트
├── stores/        # Zustand 상태 관리 스토어
├── services/      # API 및 외부 서비스 연동
├── hooks/         # 커스텀 React Hooks
├── types/         # TypeScript 타입 정의
├── utils/         # 유틸리티 함수 및 상수
├── assets/        # 정적 자산 (이미지, 폰트 등)
└── locales/       # 국제화 리소스
```

## 주요 기능

- 사용자 인증 (로그인/회원가입)
- 강의 탐색 및 검색
- 실시간 강의실 (WebRTC)
- 대시보드
- 아바타 커스터마이즈
- 실시간 채팅
- 과제 및 자료 관리

## 환경 변수

- `VITE_API_URL`: 백엔드 API URL
- `VITE_SOCKET_URL`: Socket.IO 서버 URL
- `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Anonymous Key

## 개발 가이드

### 코드 스타일

프로젝트는 ESLint와 Prettier를 사용합니다.

```bash
# 린트 실행
npm run lint

# 코드 포맷팅
npm run format
```

### Git 브랜치 전략

- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치

## 라이선스

MIT
