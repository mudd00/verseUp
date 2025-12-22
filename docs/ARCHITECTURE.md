# VerseUp 시스템 아키텍처

> 프로젝트 전체 아키텍처 및 주요 컴포넌트 문서

**최종 업데이트**: 2024-12-22

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [기술 스택](#2-기술-스택)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [프론트엔드 아키텍처](#4-프론트엔드-아키텍처)
5. [백엔드 아키텍처](#5-백엔드-아키텍처)
6. [데이터베이스 구조](#6-데이터베이스-구조)
7. [실시간 통신](#7-실시간-통신)
8. [3D 메타버스 아키텍처](#8-3d-메타버스-아키텍처)
9. [인증 및 권한](#9-인증-및-권한)
10. [배포 아키텍처](#10-배포-아키텍처)

---

## 1. 시스템 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React     │  │  Three.js   │  │     Socket.IO Client    │  │
│  │    SPA      │  │  3D Scene   │  │    (Real-time Events)   │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          │ REST API       │ WebGL               │ WebSocket
          │                │                     │
┌─────────┼────────────────┼─────────────────────┼────────────────┐
│         ▼                ▼                     ▼                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Express Server                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │    │
│  │  │  Routes  │  │ Middleware│  │ Socket.IO│  │  Static  │ │    │
│  │  │  (/api)  │  │  (Auth)   │  │ Handlers │  │  Files   │ │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘ │    │
│  └───────┼─────────────┼─────────────┼─────────────────────┘    │
│          │             │             │                           │
│          ▼             ▼             ▼                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Supabase                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │    │
│  │  │PostgreSQL│  │   Auth   │  │ Storage  │               │    │
│  │  │    DB    │  │  (JWT)   │  │  (Files) │               │    │
│  │  └──────────┘  └──────────┘  └──────────┘               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         Server Layer                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 기술 스택

### 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19 | UI 프레임워크 |
| Vite | 6 | 빌드 도구 |
| Tailwind CSS | 3 | 스타일링 |
| Zustand | 5 | 전역 상태 관리 |
| TanStack Query | 5 | 서버 상태 관리 |
| React Router | 7 | 라우팅 |
| Three.js | - | 3D 렌더링 |
| React Three Fiber | - | React + Three.js |
| Rapier | - | 3D 물리 엔진 |
| Socket.IO Client | 4 | 실시간 통신 |

### 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Express | 5 | HTTP 서버 |
| Socket.IO | 4 | WebSocket 서버 |
| Supabase | - | BaaS (DB, Auth, Storage) |
| JWT | - | 토큰 인증 |

### 외부 서비스
| 서비스 | 용도 |
|--------|------|
| Supabase | PostgreSQL + Auth + Storage |
| Toss Payments | 결제 처리 |
| Google STUN | WebRTC ICE 서버 |

---

## 3. 디렉토리 구조

```
verseUp/
├── src/                          # 프론트엔드 소스
│   ├── components/               # React 컴포넌트
│   │   ├── layout/              # 레이아웃 (Header, Layout)
│   │   ├── metaverse/           # 3D 메타버스 컴포넌트 ⭐
│   │   │   ├── Player.jsx       # 플레이어 물리/이동
│   │   │   ├── CharacterModel.jsx   # 캐릭터 모델/애니메이션
│   │   │   ├── ThirdPersonCamera.jsx # 카메라 시스템
│   │   │   ├── MapModel.jsx     # 맵 로딩/콜라이더
│   │   │   ├── Blackboard.jsx   # 판서 칠판
│   │   │   ├── DeskMonitor.jsx  # 학생 모니터
│   │   │   ├── OtherPlayer.jsx  # 멀티플레이어
│   │   │   └── MetaverseScene.jsx # 메인 씬
│   │   ├── dashboard/           # 대시보드 컴포넌트
│   │   ├── course/              # 강의 관련 컴포넌트
│   │   └── admin/               # 관리자 컴포넌트
│   ├── pages/                   # 페이지 컴포넌트
│   ├── stores/                  # Zustand 스토어
│   │   └── authStore.js         # 인증 상태
│   ├── services/                # API/Socket 클라이언트
│   │   ├── api.js               # REST API 클라이언트
│   │   └── socket.js            # Socket.IO 클라이언트
│   ├── hooks/                   # 커스텀 훅
│   │   ├── useScreenShare.js    # 화면 공유 (강사)
│   │   ├── useScreenReceive.js  # 화면 수신 (학생)
│   │   ├── useVoiceChat.js      # 음성 채팅
│   │   └── useChat.js           # 텍스트 채팅
│   ├── lib/                     # 라이브러리 초기화
│   │   └── supabase.js          # Supabase 클라이언트
│   └── utils/                   # 유틸리티
│       └── constants.js         # 상수 정의
│
├── server/                      # 백엔드 소스
│   ├── server.js                # Express 서버 진입점
│   ├── routes/                  # API 라우트
│   │   ├── index.js             # 라우트 통합
│   │   ├── auth.js              # 인증 API
│   │   ├── courses.js           # 강의 API
│   │   ├── classrooms.js        # 교실 API
│   │   ├── enrollments.js       # 수강신청 API
│   │   ├── assignments.js       # 과제 API
│   │   ├── payments.js          # 결제 API
│   │   └── notifications.js     # 알림 API
│   ├── middleware/              # Express 미들웨어
│   │   └── auth.js              # JWT 검증
│   ├── sockets/                 # Socket.IO 핸들러
│   │   └── index.js             # 소켓 이벤트 처리
│   └── utils/                   # 서버 유틸리티
│       └── supabase.js          # Supabase 서버 클라이언트
│
├── public/                      # 정적 파일
│   └── models/                  # 3D 모델 (GLB, GLTF)
│
├── docs/                        # 문서
├── supabase/                    # Supabase 설정
│   └── migrations/              # DB 마이그레이션
└── scripts/                     # 스크립트
```

---

## 4. 프론트엔드 아키텍처

### 4.1 라우팅 구조

```javascript
/                     → Home (랜딩 페이지)
/login                → Login
/register             → Register
/courses              → Courses (공개)
/courses/:id          → CourseDetail (공개)
/courses/create       → CreateCourse (인증 필요)
/courses/:id/edit     → EditCourse (인증 필요)
/my-courses           → MyCourses (인증 필요)
/dashboard            → Dashboard (인증 필요)
/profile              → Profile (인증 필요)
/metaverse            → 전체화면 3D 경험
/whiteboard-controller → 판서 컨트롤러 (강사용)
/admin                → 관리자 페이지
```

### 4.2 상태 관리

```
┌─────────────────────────────────────────────────────────┐
│                    State Management                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Zustand   │  │ TanStack    │  │     Local       │ │
│  │   (Auth)    │  │   Query     │  │     State       │ │
│  │             │  │  (Server)   │  │   (Component)   │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
│         │                │                   │          │
│         ▼                ▼                   ▼          │
│  ┌─────────────────────────────────────────────────────┐│
│  │                    Components                        ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

- **Zustand**: 인증 상태 (user, token)
- **TanStack Query**: 서버 데이터 캐싱 (courses, enrollments)
- **useState**: 로컬 컴포넌트 상태

### 4.3 컴포넌트 계층

```
App.jsx
├── Layout (Header, Navigation)
│   ├── PublicRoute (Home, Login, Register, Courses)
│   └── PrivateRoute (Dashboard, Profile, MyCourses)
│       └── RoleBasedRoute (Admin, Instructor features)
└── Metaverse (No Layout - Fullscreen)
    └── Canvas (Three.js)
        ├── Physics (Rapier)
        │   ├── MapModel
        │   ├── Player
        │   └── OtherPlayers
        └── ThirdPersonCamera
```

---

## 5. 백엔드 아키텍처

### 5.1 Express 서버 구조

```javascript
// server/server.js
Express App
├── Middleware
│   ├── cors (CORS 처리)
│   ├── express.json (JSON 파싱)
│   └── Custom Auth Middleware
├── Routes
│   ├── /health (헬스 체크)
│   └── /api/* (API 라우트)
├── Socket.IO
│   └── Real-time Event Handlers
└── Static Files (Production)
    └── dist/ (Vite 빌드)
```

### 5.2 API 라우트 패턴

```javascript
// 인증 필요 없음
GET  /api/courses           → 강의 목록
GET  /api/courses/:id       → 강의 상세

// 인증 필요
GET  /api/auth/me           → 현재 사용자
POST /api/enrollments       → 수강 신청
GET  /api/notifications     → 알림 목록

// 역할 기반 (instructor/admin)
POST /api/courses           → 강의 생성
PUT  /api/courses/:id       → 강의 수정
DELETE /api/courses/:id     → 강의 삭제
```

---

## 6. 데이터베이스 구조

### 6.1 주요 테이블

```sql
-- 사용자 프로필
profiles (id, email, name, role, avatar_url, created_at)

-- 강의
courses (id, instructor_id, classroom_id, title, description,
         category, level, thumbnail_url, price, max_students,
         start_date, weeks, time_slot_id, is_published)

-- 수강 신청
enrollments (id, user_id, course_id, payment_id, status, created_at)

-- 교실
classrooms (id, name, capacity)

-- 시간표
time_slots (id, day_of_week, start_time, end_time)

-- 과제
assignments (id, course_id, title, description, due_date)

-- 과제 제출
assignment_submissions (id, assignment_id, student_id, content,
                        file_url, grade, feedback)

-- 알림
notifications (id, user_id, type, title, message, is_read)

-- 결제
payments (id, user_id, course_id, order_id, payment_key,
          amount, status, method)
```

### 6.2 RLS (Row Level Security) 정책

```sql
-- 자신의 데이터만 수정 가능
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- 강사만 자신의 강의 수정 가능
CREATE POLICY "Instructors can update own courses"
ON courses FOR UPDATE
USING (instructor_id = auth.uid());

-- 관리자 전체 접근
CREATE POLICY "Admins have full access"
ON profiles FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);
```

---

## 7. 실시간 통신

### 7.1 Socket.IO 이벤트

```
┌─────────────────────────────────────────────────────────┐
│                   Socket.IO Events                       │
├─────────────────────────────────────────────────────────┤
│  연결/방 관리                                            │
│  ├── user:join          → 사용자 연결                    │
│  ├── room:join          → 방 입장                        │
│  ├── room:leave         → 방 퇴장                        │
│  ├── room:users         → 방 사용자 목록                  │
│  ├── room:user-joined   → 새 사용자 입장 알림             │
│  └── room:user-left     → 사용자 퇴장 알림                │
├─────────────────────────────────────────────────────────┤
│  멀티플레이어                                            │
│  ├── player:move        → 플레이어 이동                   │
│  └── player:moved       → 다른 플레이어 이동 알림          │
├─────────────────────────────────────────────────────────┤
│  화면 공유 (WebRTC Signaling)                            │
│  ├── screenshare:start  → 화면 공유 시작                  │
│  ├── screenshare:stop   → 화면 공유 종료                  │
│  ├── screenshare:offer  → WebRTC Offer                   │
│  ├── screenshare:answer → WebRTC Answer                  │
│  └── screenshare:ice-candidate → ICE 후보                │
├─────────────────────────────────────────────────────────┤
│  음성 채팅 (WebRTC Signaling)                            │
│  ├── voice:offer        → 음성 Offer                     │
│  ├── voice:answer       → 음성 Answer                    │
│  └── voice:ice-candidate → ICE 후보                      │
├─────────────────────────────────────────────────────────┤
│  판서                                                    │
│  ├── whiteboard:start   → 판서 시작                       │
│  ├── whiteboard:stop    → 판서 종료                       │
│  ├── whiteboard:draw    → 그리기 데이터                   │
│  └── whiteboard:clear   → 칠판 지우기                     │
├─────────────────────────────────────────────────────────┤
│  채팅                                                    │
│  └── chat:message       → 채팅 메시지                     │
└─────────────────────────────────────────────────────────┘
```

### 7.2 WebRTC 연결 흐름

```
강사 (Sender)                    학생 (Receiver)
     │                                │
     │ 1. screenshare:start           │
     │ ─────────────────────────────► │
     │                                │
     │ 2. Broadcast to room           │
     │ ◄──────────────────────────────│
     │                                │
     │ 3. screenshare:offer           │
     │ ─────────────────────────────► │
     │                                │
     │ 4. screenshare:answer          │
     │ ◄──────────────────────────────│
     │                                │
     │ 5. ICE Candidates (양방향)       │
     │ ◄────────────────────────────► │
     │                                │
     │ 6. Media Stream 연결            │
     │ ═════════════════════════════► │
```

---

## 8. 3D 메타버스 아키텍처

### 8.1 씬 계층 구조

```
Canvas (React Three Fiber)
├── Lighting
│   ├── ambientLight
│   └── directionalLight (shadows)
├── Environment
│   ├── Sky
│   ├── Environment (preset: sunset)
│   └── fog
├── Physics (Rapier)
│   ├── MapModel
│   │   ├── GLB Model (trimesh collider)
│   │   ├── Portal (map transition)
│   │   ├── Door (room entry/exit)
│   │   ├── InteractiveObject (chairs, desk)
│   │   └── Blackboard (판서)
│   ├── Player
│   │   ├── RigidBody (capsule collider)
│   │   └── CharacterModel (GLTF + animations)
│   └── OtherPlayers (multiplayer)
│       └── CharacterModel (per player)
└── ThirdPersonCamera
    └── Pointer Lock Control
```

### 8.2 물리 설정 (고정값)

```javascript
// 변경 금지 - 튜닝된 값
const PLAYER_SETTINGS = {
  startPosition: [0, 2, 0],
  capsule: {
    halfHeight: 0.8,
    radius: 0.52,
    yOffset: 1.28
  },
  speed: {
    walk: 8,
    run: 18,
    stepUp: 4
  }
}
```

### 8.3 애니메이션 패턴

```javascript
// 필수: 이름으로 액션 찾기
const idleAction = actions['Idle']
const walkAction = actions['Walk'] || actions.Walking

// 금지: 인덱스로 접근 (순서 보장 안 됨)
// const action = Object.values(actions)[0]

// 애니메이션 전환
idleAction?.reset().fadeIn(0.2).play()
walkAction?.reset().fadeOut(0.2).stop()
```

---

## 9. 인증 및 권한

### 9.1 인증 흐름

```
┌─────────────────────────────────────────────────────────┐
│                   Authentication Flow                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Login/Register                                       │
│     └── Supabase Auth (email/password)                   │
│         └── Returns JWT Token                            │
│                                                          │
│  2. Token Storage                                        │
│     └── localStorage.setItem('accessToken', token)       │
│                                                          │
│  3. API Request                                          │
│     └── Authorization: Bearer {token}                    │
│                                                          │
│  4. Server Verification                                  │
│     └── authMiddleware → supabase.auth.getUser(token)    │
│         └── Attach user to req.user                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 9.2 역할 기반 접근 제어

| 역할 | 권한 |
|------|------|
| student | 강의 조회, 수강 신청, 과제 제출 |
| instructor | student + 강의 CRUD, 과제 생성, 채점 |
| admin | 모든 권한 + 사용자 관리, 시스템 설정 |

---

## 10. 배포 아키텍처

### 10.1 Render 배포 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Render Web Service                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Build: npm install && npm run build:client              │
│  Start: npm start                                        │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Express Server (PORT)                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│  │  │   /api/*    │  │ /socket.io  │  │   Static    │ │ │
│  │  │  REST API   │  │  WebSocket  │  │   (dist/)   │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│                     Supabase                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │PostgreSQL│  │   Auth   │  │ Storage  │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────┘
```

### 10.2 환경 변수

```bash
# 서버
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-app.onrender.com
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=...

# 프론트엔드 (빌드 시 주입)
VITE_API_URL=https://your-app.onrender.com
VITE_SOCKET_URL=https://your-app.onrender.com
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|-----------|--------|
| 2024-12-22 | 초기 아키텍처 문서 작성 | Claude |

