# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

VerseUp은 전통적인 온라인 교육과 3D 가상 환경을 결합한 웹 기반 메타버스 학습 플랫폼입니다. 프론트엔드(React SPA)와 백엔드(Express + Socket.IO)를 단일 레포지토리에 포함하며, 공유 의존성을 사용하는 모노레포 구조입니다.

**핵심 가치**: "편하게 놀고 소통하는 웹 메타버스 학습 플랫폼"

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev:both          # 프론트엔드 + 백엔드 동시 실행 (권장)
npm run dev               # 프론트엔드만 실행 (포트 5173)
npm run dev:server        # 백엔드만 실행 (포트 3000)

# 빌드 & 프로덕션
npm run build             # 클라이언트 빌드 (Vite)
npm start                 # 프로덕션 서버 실행

# 코드 품질
npm run lint              # ESLint 검사
npm run format            # Prettier 포맷팅
```

## 프로젝트 규칙 & 관례

### 절대 하지 말 것 (명시적 요청 없이)
- `npm install`, `npm ci`, clean 작업, 패키지 재설치
- 실제 `.env` 파일 생성 또는 노출 (`.env.example`만 참조)
- 바이너리 파일 자동 포맷 (FBX, GLB, 이미지 등)
- 기존 에셋 파일명 변경 또는 이동
- 튜닝된 물리 값, 카메라 설정, 콜라이더 설정 변경
- **Git 명령어 실행 (add, commit, push 등)** - 사용자가 직접 수동으로 처리

### 코드 포맷팅 & 린팅
- `.prettierrc`와 ESLint 설정을 엄격히 준수
- 텍스트 파일만 포맷 (`.js`, `.jsx`, `.json`, `.css`, `.md`)

### DevTools/MCP 스크린샷 규칙
- Anthropic API 5MB 이미지 제한 주의
- 스크린샷: `filePath` 옵션으로 파일 저장, JPEG 포맷 + 품질 60-70 사용
- 또는 `take_snapshot` (텍스트 기반 a11y tree) 우선 사용

### 3D & 물리 설정 보존
- **플레이어 물리**:
  - 시작 위치: `[0, 2, 0]`
  - 캡슐 콜라이더: halfHeight=0.8, radius=0.52, y offset=1.28
  - 이동 속도: WALK_SPEED=8, RUN_SPEED=18
  - 계단 오르기: STEP_UP_SPEED=4
- **카메라**: 포인터 락 시스템 유지 (클릭으로 잠금, ESC로 해제)
- **캐릭터 모델**: scale=0.8, 애니메이션: Idle/Walk/Run
- **애니메이션**: `isMoving` 기반 애니메이션 전환 로직 보존

### 3D 애니메이션 패턴 (필수)
- `useAnimations`에서 액션을 찾을 때 **인덱스 대신 이름으로 찾기**
  - ❌ 금지: `Object.values(actions)[0]` (순서 보장 안 됨)
  - ✅ 권장: `actions[clipName]` (클립 이름으로 액션 찾기)
- FBX 모델 복제 시 `SkeletonUtils.clone()` 사용 (`three-stdlib`에서 import)
- GLTF 모델 예시 (현재 사용 중):
  ```javascript
  const { scene, animations } = useGLTF('/models/BaseCharacter.gltf')
  const { actions } = useAnimations(animations, group)

  const idleAction = actions['Idle']
  const walkAction = actions['Walk'] || actions.Walking
  idleAction?.reset().fadeIn(0.2).play()
  ```

### API 500 에러 방지 규칙
1. **환경 변수 검증**: 외부 서비스 사용 전 존재 확인
   ```javascript
   if (!supabase) {
     return res.status(503).json({ error: 'Database service unavailable' })
   }
   ```
2. **비동기 에러 핸들링**: 모든 async 라우트에 try-catch 필수
3. **Null 안전성**: 옵셔널 체이닝 + 기본값 사용
   ```javascript
   const role = user?.user_metadata?.role || 'student'
   ```

## 아키텍처 개요

### 모노레포 구조
- **프론트엔드**: `src/` - React 19 + Vite
- **백엔드**: `server/` - Express 5 + Socket.IO
- **정적 파일**: `public/` - 3D 모델 (`public/models/`)

### 기술 스택

**프론트엔드**: React 19, Vite 6, Tailwind CSS, Zustand, TanStack Query v5, React Router v7, Three.js + React Three Fiber, Rapier (물리 엔진), Socket.IO Client

**백엔드**: Express 5, Socket.IO 4, Supabase (PostgreSQL + Auth), JWT

### 프론트엔드 아키텍처

**라우팅** (`src/App.jsx`):
```
/                   → Home (랜딩 페이지)
/login              → Login
/register           → Register
/courses            → Courses (공개)
/courses/:id        → CourseDetail (공개)
/courses/create     → CreateCourse (인증 필요)
/courses/:id/edit   → EditCourse (인증 필요)
/my-courses         → MyCourses (인증 필요)
/dashboard          → Dashboard (인증 필요)
/profile            → Profile (인증 필요)
/metaverse          → 전체화면 3D 경험 (레이아웃 없음)
```

**인증 보호**:
- `PrivateRoute` 컴포넌트로 인증 필요 페이지 보호
- Zustand 스토어 (`authStore`)에서 인증 상태 관리
- 미인증 시 자동 로그인 페이지로 리다이렉트

**경로 별칭**: `@/*`는 `./src/*`로 매핑

**API 통신**:
- REST: `src/services/api.js` - JWT 자동 주입
- WebSocket: `src/services/socket.js`
- Vite가 개발 모드에서 `/api`, `/socket.io`를 백엔드로 프록시

### 백엔드 아키텍처

**서버 구조** (`server/server.js`):
- Express HTTP 서버 + Socket.IO
- Health check: `GET /health`
- API 라우트: `/api/*` (`server/routes/`)

**API 라우트**:
```
GET    /api/auth/me              → 현재 사용자 (인증 필요)
GET    /api/courses              → 강의 목록 (mock data)
GET    /api/courses/:id          → 강의 상세 (mock data)
POST   /api/courses/:id/enroll   → 수강 신청 (인증 필요, mock data)
```

**인증 방식**:
- Supabase Auth 사용 (이메일/비밀번호)
- JWT 토큰을 localStorage에 저장
- Role은 user_metadata에서 우선 조회, 없으면 이메일 기반 추론 (`instructor@`, `admin@` 접두사)
- authMiddleware (`server/middleware/auth.js`)에서 JWT 검증

**Socket.IO 이벤트**:
```
user:join, room:join/leave, chat:message, webrtc:offer/answer/ice-candidate
```

### 3D 메타버스 아키텍처

**씬 계층 구조** (`src/components/metaverse/MetaverseScene.jsx`):
```
<Canvas>
  ├── Lighting, Sky, Environment, fog
  ├── <Physics gravity={[0, -20, 0]}>
  │   ├── <MapModel> (환경 + 콜라이더)
  │   └── <Player> (RigidBody + CharacterModel)
  └── <ThirdPersonCamera>
```

**주요 컴포넌트**:
- `Player.jsx`: Rapier 물리, WASD 이동, Shift 달리기, 계단 오르기 로직
- `ThirdPersonCamera.jsx`: 포인터 락 3인칭 카메라
- `CharacterModel.jsx`: GLTF 로드, Idle/Walk/Run 애니메이션 전환
- `MapModel.jsx`: GLB 맵 로드 + 바닥 콜라이더
- `useKeyboardControls.js`: 키보드 입력 감지 커스텀 훅

## 새 기능 추가하기

### 프론트엔드
1. `src/pages/`에 페이지 또는 `src/components/`에 컴포넌트 추가
2. `src/App.jsx`에 라우트 정의
3. 필요시 `src/services/api.js`에 API 호출 추가

### 백엔드
1. `server/routes/`에 라우트 파일 추가
2. `server/routes/index.js`에 등록
3. 실시간 통신 필요시 `server/sockets/index.js`에 이벤트 추가

### 3D/메타버스
1. `src/components/metaverse/`에 컴포넌트 추가
2. 모델 로딩: `@react-three/drei`의 `useGLTF`
3. 물리: `@react-three/rapier`의 `RigidBody`
4. 에셋: `public/models/`에 배치

## 환경 변수

**프론트엔드** (`VITE_` 접두사):
```
VITE_API_URL, VITE_SOCKET_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

**백엔드**:
```
PORT, NODE_ENV, CORS_ORIGIN, SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
```

## 개발 워크플로우

1. `npm run dev:both` 실행
2. 프론트엔드: http://localhost:5173
3. 백엔드: http://localhost:3000
4. 메타버스 테스트: `/metaverse` 라우트 → 캔버스 클릭 → WASD 이동, Shift 달리기

## 현재 구현 상태

**완료**:
- ✅ 기본 프로젝트 구조 (모노레포)
- ✅ 인증 시스템 (Supabase Auth + JWT)
- ✅ 3D 메타버스 (캐릭터, 이동, 카메라)
- ✅ 기본 라우팅 및 페이지 구조
- ✅ Zustand 상태 관리
- ✅ Socket.IO 기본 설정

**진행 중** (Mock Data 사용):
- 🚧 강의 CRUD (courses routes에 TODO 주석 있음)
- 🚧 수강 신청 기능
- 🚧 대시보드 데이터 연동

**미구현**:
- ❌ WebRTC 실시간 강의실
- ❌ 실시간 채팅
- ❌ 3D 아바타 커스터마이징
- ❌ 과제 및 자료 관리

## 알려진 경고 (무시 가능)
- Rapier deprecated init params
- FBX shininess map 경고
- >4 skin weights (자동 clamp)
- React Router future flags (v7 마이그레이션 관련)

## 주요 디렉토리 구조
```
src/
├── components/
│   ├── layout/          # Header, Layout 컴포넌트
│   ├── metaverse/       # 3D 메타버스 관련 컴포넌트
│   ├── dashboard/       # 대시보드 컴포넌트
│   └── course/          # 강의 관련 컴포넌트
├── pages/               # 페이지 컴포넌트
├── stores/              # Zustand 스토어 (authStore 등)
├── services/            # API 클라이언트, Socket 클라이언트
├── lib/                 # 라이브러리 초기화 (supabase)
└── utils/               # 유틸리티 (constants 등)

server/
├── routes/              # API 라우트 (auth, courses)
├── middleware/          # Express 미들웨어 (auth)
├── sockets/             # Socket.IO 이벤트 핸들러
└── utils/               # 유틸리티 (supabase client)

public/
└── models/              # 3D 모델 파일 (GLTF, GLB, FBX)
```

## 추가 문서
- `plan.md`: 프로젝트 계획, MVP 로드맵
- `BLENDER_EXPORT_GUIDE.md`: 3D 모델 내보내기
- `CHARACTER_GUIDE.md`: 캐릭터 모델 설정
