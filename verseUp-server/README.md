# VerseUp! - Backend Server

VerseUp! 메타버스 학습 플랫폼 백엔드 서버

## 기술 스택

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Real-time**: Socket.IO
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT

## 시작하기

### 필수 요구사항

- Node.js 18+
- npm
- Supabase 프로젝트

### 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 Supabase 및 기타 환경 변수를 설정하세요
```

### 개발 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 빌드

```bash
npm run build
```

### 프로덕션 실행

```bash
npm start
```

## 프로젝트 구조

```
src/
├── routes/         # API 라우터
├── controllers/    # 컨트롤러 로직
├── services/       # 비즈니스 로직
├── middleware/     # Express 미들웨어
├── sockets/        # Socket.IO 이벤트 핸들러
├── types/          # TypeScript 타입 정의
├── utils/          # 유틸리티 함수
└── server.ts       # 서버 진입점
```

## API 엔드포인트

### Health Check
- `GET /health` - 서버 상태 확인

### Authentication
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보

### Courses
- `GET /api/courses` - 강의 목록
- `GET /api/courses/:id` - 강의 상세
- `POST /api/courses/:id/enroll` - 강의 등록

## Socket.IO 이벤트

### Client → Server
- `user:join` - 사용자 접속
- `room:join` - 룸 입장
- `room:leave` - 룸 퇴장
- `chat:message` - 채팅 메시지
- `webrtc:offer` - WebRTC Offer
- `webrtc:answer` - WebRTC Answer
- `webrtc:ice-candidate` - ICE Candidate

### Server → Client
- `user:joined` - 사용자 접속 완료
- `room:users` - 룸 사용자 목록
- `room:user-joined` - 사용자 입장 알림
- `room:user-left` - 사용자 퇴장 알림
- `chat:message` - 채팅 메시지
- `webrtc:offer` - WebRTC Offer
- `webrtc:answer` - WebRTC Answer
- `webrtc:ice-candidate` - ICE Candidate

## 환경 변수

```bash
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
JWT_SECRET=your-jwt-secret
```

## 개발 가이드

### 코드 스타일

```bash
# 린트 실행
npm run lint

# 코드 포맷팅
npm run format
```

## 라이선스

MIT
