# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 레포지토리에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

VerseUp은 전통적인 온라인 교육과 3D 가상 환경을 결합한 웹 기반 메타버스 학습 플랫폼입니다. 프론트엔드(React SPA)와 백엔드(Express + Socket.IO)를 단일 레포지토리에 포함하며, 공유 의존성을 사용하는 모노레포 구조입니다.

**핵심 가치**: "편하게 놀고 소통하는 웹 메타버스 학습 플랫폼"

## 개발 명령어

### 개발 서버 실행
```bash
npm run dev:both          # 프론트엔드 + 백엔드 동시 실행 (권장)
npm run dev               # 프론트엔드만 실행 (포트 5173)
npm run dev:server        # 백엔드만 실행 (포트 3000)
```

### 빌드 & 프로덕션
```bash
npm run build             # 클라이언트 + 서버 전체 빌드
npm run build:client      # 프론트엔드만 빌드 (Vite)
npm run build:server      # 백엔드만 빌드 (tsc)
npm start                 # 프로덕션 서버 실행
npm run preview           # 프로덕션 빌드 미리보기
```

### 코드 품질
```bash
npm run lint              # ESLint 검사
npm run format            # Prettier 포맷팅
npx tsc --noEmit          # TypeScript 타입 체크
```

## 프로젝트 규칙 & 관례

### 절대 하지 말 것 (명시적 요청 없이)
- **절대 금지**: `npm install`, `npm ci`, clean 작업, 패키지 재설치
- **절대 금지**: 실제 `.env` 파일 생성 또는 노출 (`.env.example`만 참조)
- **절대 금지**: 바이너리 파일 자동 포맷 (FBX, GLB, 이미지 등)
- **절대 금지**: 기존 에셋 파일명 변경 또는 이동
- **절대 금지**: 기존 파일/폴더명 수정
- **절대 금지**: 튜닝된 물리 값, 카메라 설정, 콜라이더 설정 변경

### 코드 포맷팅 & 린팅
- `.prettierrc`와 ESLint 설정을 엄격히 준수
- 새 파일은 기존 TypeScript/TSX 스타일과 일치시킬 것
- 텍스트 파일만 포맷 (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`)

### DevTools/MCP 사용 규칙
- **이미지 크기 제한**: Anthropic API는 5MB 이미지 제한 (초과 시 400 에러)
- **스크린샷 촬영 시 필수 규칙**:
  - `filePath` 옵션 사용하여 파일로 저장 (응답에 base64로 직접 첨부하지 않기)
  - JPEG 포맷 + 품질 60-70 사용 (PNG 대신)
  - 또는 `take_snapshot` (텍스트 기반 a11y tree) 우선 사용
- **예시**: `take_screenshot({ filePath: './screenshot.jpg', format: 'jpeg', quality: 70 })`
- 5MB 이상 스크린샷은 base64 인코딩 시 제한 초과 가능

### 서버 구조 보존
- `server/server.ts`를 메인 진입점으로 유지 (Express + Socket.IO)
- `server/routes/`의 라우트 구조 유지
- `server/middleware/`의 미들웨어 유지
- 유틸리티는 `server/utils/`에 배치
- 타입은 `server/types/`에 배치

### 3D & 물리 설정 보존
- **플레이어 물리**: 시작 위치 y=10, 공 콜라이더, friction=1, restitution=0
- **카메라**: 포인터 락 시스템 유지 (클릭으로 잠금, ESC로 해제)
- **콜라이더**: 바닥 콜라이더 크기 (500×1×500, y=-0.5) 유지
- **애니메이션**: `isMoving` 기반 애니메이션 전환 로직 보존
- **모델 경로**: `public/models/Standing Idle.fbx`와 `Walking.fbx` 경로 유지

### FBX 애니메이션 패턴 (필수)
- **필수**: `useAnimations`에서 액션을 찾을 때 **인덱스 대신 이름으로 찾기**
  - ❌ 금지: `Object.values(actions)[0]`, `Object.values(actions)[1]` (순서 보장 안 됨, undefined 발생)
  - ✅ 권장: `actions[clipName]` (클립 이름으로 액션 찾기)
- **필수**: FBX 모델 복제 시 `SkeletonUtils.clone()` 사용 (`three-stdlib`에서 import)
- **패턴**: Mixamo without skin 클립도 with skin 메시에 적용 가능 (동일 리그라면)
- **예시**:
  ```typescript
  const idleClip = idleFbx.animations[0]
  const idleName = idleClip?.name || 'Idle'
  const { actions } = useAnimations([idleClip, walkClip].filter(Boolean), group)

  // 이름으로 액션 찾기
  const idle = actions?.[idleName]
  idle?.reset().fadeIn(0.2).play()
  ```

### 에셋 관리
- 바이너리 파일 (FBX, GLB, 텍스처): 불필요한 수정이나 경로 변경 금지
- 새 에셋: `public/models/` 하위 적절한 디렉토리에 명확한 이름으로 배치
- 에셋 경로는 명시적 요청이 있을 때만 수정

### 일반 원칙
**명시적 요청이 없으면 기존 동작과 튜닝을 보존하세요.** 의심스러우면 작동 중인 설정을 수정하기 전에 물어보세요.

## 아키텍처 개요

### 모노레포 구조
- **프론트엔드**: `src/` - React 19 + TypeScript + Vite
- **백엔드**: `server/` - Express 5 + Socket.IO + TypeScript
- **공유**: 모든 의존성을 포함하는 단일 `package.json`
- **정적 파일**: `public/` - 3D 모델을 포함한 에셋 (`public/models/`)

### 기술 스택

**프론트엔드**:
- React 19, TypeScript, Vite 6
- Tailwind CSS (커스텀 컬러 팔레트)
- Zustand (상태 관리), TanStack Query v5 (데이터 페칭)
- React Router v7 (라우팅)
- Three.js + React Three Fiber (@react-three/fiber, @react-three/drei)
- Rapier (@react-three/rapier) - 물리 엔진
- Socket.IO Client (실시간 통신)

**백엔드**:
- Express 5, TypeScript
- Socket.IO 4 (WebSocket + 폴백)
- Supabase (PostgreSQL + Auth)
- JWT 인증

### 프론트엔드 아키텍처

**라우팅** (`src/App.tsx`에 정의):
```
/              → Home (랜딩 페이지)
/login         → Login (로그인)
/courses       → Courses (공개)
/dashboard     → Dashboard (PrivateRoute로 인증 필요)
/metaverse     → 전체화면 3D 경험 (레이아웃 래퍼 없음)
```

**레이아웃 패턴**:
- `/metaverse`를 제외한 모든 라우트는 `<Layout>` 래퍼 사용 (Header + Outlet)
- PrivateRoute HOC는 인증되지 않은 경우 `/login`으로 리디렉션

**경로 별칭**: `@/*`는 `./src/*`로 매핑
```typescript
import { apiService } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
```

**API 통신**:
- REST: `src/services/api.ts` - JWT 자동 주입이 있는 ApiService 클래스
- WebSocket: `src/services/socket.ts` - SocketService 래퍼
- Base URL: `VITE_API_URL` (기본값: http://localhost:3000)
- Vite는 개발 모드에서 `/api`와 `/socket.io`를 백엔드로 프록시

**상태 관리**:
- Zustand로 클라이언트 상태 관리 (`src/stores/authStore.ts`의 인증)
- TanStack Query로 서버 상태 관리
- 컴포넌트별 상태는 React hooks로 로컬 상태 관리

### 백엔드 아키텍처

**서버 구조** (`server/server.ts`):
- CORS, JSON 파싱이 있는 Express HTTP 서버
- Health check: `GET /health`
- API 라우트: `/api/*` (`server/routes/`에 정의)
- 동일한 HTTP 서버에 Socket.IO 연결

**API 라우트** (`/api`):
```
POST   /api/auth/login           → Mock 로그인 (TODO: Supabase)
GET    /api/auth/me              → 현재 사용자 (인증 필요)
GET    /api/courses              → 강의 목록
GET    /api/courses/:id          → 강의 상세
POST   /api/courses/:id/enroll   → 수강 신청 (인증 필요)
```

**Socket.IO 이벤트** (실시간):
```
user:join, user:joined           → 사용자 등록
room:join, room:leave            → 룸 관리
room:users, room:user-joined/left → 사용자 접속 상태
chat:message                     → 채팅 메시지
webrtc:offer/answer/ice-candidate → WebRTC 시그널링
```

**인증**:
- `Authorization: Bearer <token>` 헤더에 JWT 포함
- 미들웨어 (`server/middleware/auth.ts`)가 Supabase로 검증
- 보호된 라우트에서는 `req.user`에 사용자 정보 첨부
- 현재는 MOCK 인증 사용 중 - Supabase 통합 필요

### 3D 메타버스 아키텍처

**씬 계층 구조** (`src/components/metaverse/MetaverseScene.tsx`):
```
<Canvas>
  ├── Lighting (ambient + directional with shadows)
  ├── <Sky>, <Environment>, <fog>
  ├── <Physics gravity={[0, -20, 0]}> (Rapier)
  │   ├── <MapModel> (콜라이더가 있는 환경)
  │   └── <Player> (물리가 적용된 캐릭터)
  │       ├── <RigidBody> (공 콜라이더, friction=1, restitution=0)
  │       └── <CharacterModel> (시각적 메시)
  └── <ThirdPersonCamera> (플레이어 따라감)
```

**플레이어 컨트롤러** (`src/components/metaverse/Player.tsx`):
- 물리: Rapier 공 콜라이더, y=10에서 시작
- 조작: WASD/방향키 (카메라 기준), 스페이스바 (점프)
- 이동: `useBeforePhysicsStep`로 임펄스 적용, 속도 제한
- 회전: `useFrame`으로 카메라와 동기화

**카메라** (`src/components/metaverse/ThirdPersonCamera.tsx`):
- 포인터 락이 있는 3인칭 카메라 (클릭으로 잠금, ESC로 해제)
- 마우스 이동으로 azimuth/polar 각도 제어
- 콜백: `onAngleChange`로 플레이어 회전 업데이트

**캐릭터 애니메이션** (`src/components/metaverse/CharacterModel.tsx`):
- Idle: `public/models/Standing Idle.fbx` (정지 상태)
- Walking: `public/models/Walking.fbx` (이동 중)
- WASD 입력의 `isMoving` prop으로 전환
- FBXLoader로 Mixamo 애니메이션 로드, 스케일 0.01, 페이드 전환 0.2초

**맵 모델** (`src/components/metaverse/MapModel.tsx`):
- useGLTF로 `public/models/map.glb` 로드
- ErrorBoundary + Suspense, 폴백 (primitive box)
- 큰 투명 바닥 콜라이더 (500×1×500, y=-0.5)
- 거대한 모델은 자동으로 축소, 바닥을 y=0에 정렬

## 주요 패턴 & 관례

### 상태 관리 패턴
```typescript
// Zustand store (authStore.ts)
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user, token) => {
    localStorage.setItem('accessToken', token)
    set({ user, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('accessToken')
    set({ user: null, isAuthenticated: false })
  }
}))

// 사용법
const { user, login, logout } = useAuthStore()
```

### API 서비스 패턴
```typescript
// 중앙화된 API 클라이언트 (services/api.ts)
const courses = await apiService.get<Course[]>('/api/courses')
const course = await apiService.post<Course>('/api/courses', data)
```

### Socket.IO 패턴
```typescript
// 서비스 래퍼 (services/socket.ts)
socketService.connect(token)
socketService.on('chat:message', (message) => console.log(message))
socketService.emit('chat:message', { roomId: '123', message: 'Hello' })
```

### 코드 스타일
- TypeScript strict 모드, 명시적 타입, `any` 금지
- 함수형 컴포넌트 + 훅 (클래스 컴포넌트 금지)
- src 임포트에 경로 별칭 `@/*` 사용
- 컴포넌트는 PascalCase (`.tsx`), 유틸은 camelCase (`.ts`)
- Tailwind 유틸리티 클래스 사용, 커스텀 CSS 최소화

## 환경 변수

**중요**: 실제 `.env` 파일을 절대 생성하거나 수정하지 마세요. 문서화를 위해 `.env.example`만 참조하세요.

**프론트엔드** (`VITE_` 접두사가 있는 `.env`):
```bash
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

**백엔드** (`.env`):
```bash
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-service-key>
JWT_SECRET=<your-jwt-secret>
```

## 중요 구현 사항

### 현재 MVP 상태
**구현 완료**:
- 라우팅과 레이아웃 시스템이 있는 React SPA
- CORS와 Socket.IO가 있는 Express API
- 실시간 통신 (룸, 채팅, WebRTC 시그널링)
- 물리(Rapier)와 플레이어 컨트롤러가 있는 3D 메타버스
- 포인터 락이 있는 3인칭 카메라
- 캐릭터 애니메이션 (움직임에 따른 idle/walking)
- 콜라이더와 에러 바운더리가 있는 맵 로딩
- Zustand 인증 스토어, JWT가 있는 API 서비스

**TODO** (코드에 표시됨):
- 실제 Supabase 인증 (현재 mock)
- 데이터베이스 쿼리 (현재 라우트에 mock 데이터)
- 사용자 등록, 강의 수강 신청 로직
- 실시간 세션 관리, 과제/퀴즈
- WebRTC peer-to-peer 스트림 (시그널링 준비 완료)
- 아바타 커스터마이징 UI
- 관리자 대시보드, 결제/구독

### 알려진 경고 (무시해도 안전)
- Rapier deprecated init params
- FBX shininess map 경고
- >4 skin weights (자동으로 clamp됨)

## 새 기능 추가하기

### 프론트엔드 기능
1. `src/pages/`에 페이지 추가 또는 `src/components/`에 컴포넌트 추가
2. `src/App.tsx`에 라우트 정의
3. 필요시 `src/services/api.ts`에 API 호출 추가
4. `src/types/index.ts`에 타입 업데이트

### 백엔드 기능
1. `server/routes/`에 라우트 파일 추가
2. `server/routes/index.ts`에 등록
3. 실시간 통신이 필요하면 `server/sockets/index.ts`에 Socket.IO 이벤트 추가
4. `server/types/index.ts`에 타입 업데이트

### 3D/메타버스 기능
1. `src/components/metaverse/`에 컴포넌트 추가
2. 모델 로딩에 `@react-three/drei`의 `useGLTF` 사용
3. 물리 적용에 `@react-three/rapier`의 `RigidBody` 사용
4. 3D 에셋은 `public/models/`에 배치

## 3D 모델 가이드라인

**Blender 내보내기** (`BLENDER_EXPORT_GUIDE.md` 참조):
- 작은 파일 크기를 위해 GLB (바이너리)로 내보내기
- 모디파이어 적용, origin을 geometry로 설정
- 최적화: decimate, 버텍스 병합, 사용하지 않는 머티리얼 제거
- 커밋 전에 `public/models/`에서 테스트

**캐릭터 모델** (`CHARACTER_GUIDE.md` 참조):
- Mixamo: FBX 다운로드, 코드에서 스케일 0.01
- Ready Player Me: GLB 다운로드, 스케일 1.0
- FBX는 FBXLoader 사용, GLB는 useGLTF 사용
- 애니메이션: Drei의 `useAnimations` 훅으로 제어

## 개발 워크플로우

1. **개발 시작**: `npm run dev:both` (프론트엔드 + 백엔드 실행)
2. **프론트엔드**: http://localhost:5173 (HMR이 있는 Vite 개발 서버)
3. **백엔드**: http://localhost:3000 (tsx watch가 있는 Express)
4. **API 프록시**: Vite가 `/api`와 `/socket.io`를 포트 3000으로 프록시
5. **빌드**: `npm run build` (`dist/`로 출력)
6. **프로덕션**: `npm start` (`dist/`에서 서빙)

## 3D 경험 테스트하기

1. `/metaverse` 라우트로 이동
2. 캔버스 클릭해서 포인터 잠금 (커서 숨김)
3. WASD/방향키로 이동 (카메라 기준)
4. 스페이스바로 점프
5. 마우스로 캐릭터 주변 카메라 회전
6. ESC로 포인터 잠금 해제
7. 캐릭터는 정지 시 idle 애니메이션, 이동 시 walking 애니메이션 재생

## Git 브랜치 전략

- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발
- `fix/*`: 버그 수정

## 추가 문서

- `README.md`: 설치 방법 및 기술 스택 (한국어)
- `plan.md`: 포괄적인 프로젝트 계획, MVP 로드맵, 시스템 아키텍처
- `docs/progress.md`: 개발 진행 상황 추적
- `BLENDER_EXPORT_GUIDE.md`: 3D 모델 내보내기 가이드
- `CHARACTER_GUIDE.md`: 캐릭터 모델 설정 가이드
- `SESSION-2025-11-20.md`: 최신 개발 세션 노트
