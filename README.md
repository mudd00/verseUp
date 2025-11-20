# VerseUp!

편하게 놀고 소통하는 웹 메타버스 학습 플랫폼

## 프로젝트 구조

이 프로젝트는 **단일 저장소(Single Repository)** 구조로, 프론트엔드와 백엔드가 통합되어 있습니다.

```
verseUp/
├── verseUp/           # 통합 프로젝트 (프론트 + 백엔드)
│   ├── src/          # React 프론트엔드
│   ├── server/       # Express 백엔드
│   └── package.json  # 통합 의존성
└── README.md         # 이 파일
```

## 시작하기

### 설치 및 실행

```bash
# verseUp 폴더로 이동
cd verseUp

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 필요한 환경 변수를 설정하세요

# 개발 서버 실행 (프론트 + 백엔드 동시 실행)
npm run dev:both
```

자세한 내용은 [verseUp/README.md](verseUp/README.md)를 참고하세요.

## 기술 스택

### Frontend
- React 19, TypeScript, Vite
- Three.js, React Three Fiber
- Tailwind CSS, Framer Motion
- Socket.IO Client

### Backend
- Node.js, Express
- Socket.IO
- Supabase
- JWT

## 라이선스

MIT
