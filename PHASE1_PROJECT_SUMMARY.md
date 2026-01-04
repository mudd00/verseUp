# VerseUp! 1차 프로젝트 정리 문서

> 2차 프로젝트(완성본) 개발을 위한 참조 문서
> 작성일: 2025.12.XX

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택 비교](#2-기술-스택-비교)
3. [기능 구현 현황](#3-기능-구현-현황)
4. [미구현 기능 목록](#4-미구현-기능-목록)
5. [디렉토리 구조](#5-디렉토리-구조)
6. [데이터베이스 스키마](#6-데이터베이스-스키마)
7. [API 엔드포인트 목록](#7-api-엔드포인트-목록)
8. [Socket.IO 이벤트 목록](#8-socketio-이벤트-목록)
9. [핵심 컴포넌트 설명](#9-핵심-컴포넌트-설명)
10. [2차 마이그레이션 가이드](#10-2차-마이그레이션-가이드)

---

## 1. 프로젝트 개요

### 프로젝트명
**VerseUp!** - 메타버스 학습 플랫폼

### 프로젝트 목표
- 몰입감 있는 3D 메타버스 기반 온라인 학습 환경 구축
- 실시간 상호작용이 가능한 화상 강의 시스템 구현
- 학생-강사-학부모-관리자 간 유기적인 교육 생태계 구성
- 직관적인 학습 관리 및 진도 추적 시스템 제공

### 사용자 역할 (4-tier)
| 역할 | 설명 |
|------|------|
| **학생 (student)** | 강의 수강, 과제 제출, 메타버스 입장 |
| **강사 (instructor)** | 강의 생성/관리, 출석/진도 관리, 화면 공유 |
| **학부모 (parent)** | 자녀 학습 현황 조회, 메타버스 참관 |
| **관리자 (admin)** | 사용자/강의/결제/시스템 전체 관리 |

### 배포 환경
- **프론트엔드 + 백엔드**: Render (단일 서버)
- **프로덕션 URL**: https://verseup.onrender.com
- **데이터베이스**: Supabase Cloud

---

## 2. 기술 스택 비교

### 1차 프로젝트 (현재)

| 계층 | 기술 |
|------|------|
| **프론트엔드** | React 19, Vite 6, Tailwind CSS |
| **상태관리** | Zustand, TanStack Query v5 |
| **라우팅** | React Router v7 |
| **3D 엔진** | Three.js, React Three Fiber, Rapier |
| **백엔드** | Express 5, Socket.IO 4 |
| **데이터베이스** | Supabase (PostgreSQL + Auth + Storage) |
| **인증** | Supabase Auth + JWT |
| **결제** | 토스페이먼츠 SDK |
| **실시간** | Socket.IO, WebRTC |

### 2차 프로젝트 (예정)

| 계층 | 기술 |
|------|------|
| **프론트엔드** | React (유지) 또는 새로운 프레임워크 |
| **백엔드** | **Spring Boot + Java** |
| **데이터베이스** | **PostgreSQL (직접 관리) 또는 MySQL** |
| **인증** | **Spring Security + JWT** |
| **ORM** | **JPA/Hibernate** |
| **실시간** | WebSocket (Spring WebSocket) |

### 마이그레이션 시 고려사항

#### 프론트엔드 (유지 가능)
- React 컴포넌트 대부분 재사용 가능
- API 호출 부분만 엔드포인트 변경 필요
- 3D 메타버스 코드 그대로 사용 가능

#### 백엔드 (완전 재작성)
| 현재 (Express) | 변경 (Spring) |
|----------------|---------------|
| `server/routes/*.js` | `@RestController` 클래스들 |
| `authMiddleware` | `@PreAuthorize`, Spring Security Filter |
| Supabase Client | JPA Repository |
| Socket.IO | Spring WebSocket + STOMP |

#### 데이터베이스 (스키마 마이그레이션)
- Supabase RLS 정책 → Spring Security 권한 체크로 변환
- UUID 기반 PK 유지 권장
- 외래키 관계 동일하게 구성

---

## 3. 기능 구현 현황

### 완전 구현 (100%)

#### 인증 시스템
- [x] 이메일/비밀번호 회원가입 (4가지 역할)
- [x] 로그인/로그아웃
- [x] JWT 토큰 관리 (자동 갱신)
- [x] 역할 기반 접근 제어 (RBAC)
- [x] 부모 계정 초대 코드 시스템

#### 강의 관리
- [x] 강의 CRUD (생성/조회/수정/삭제)
- [x] 강의 검색/필터/정렬
- [x] 수강 신청/취소
- [x] 정원 관리 (충돌 감지)
- [x] 시간표 시스템 (교실, 시간대)
- [x] 강의 자료 업로드/다운로드

#### 과제 시스템
- [x] 과제 CRUD
- [x] 파일 업로드 (Supabase Storage)
- [x] 과제 제출 (학생)
- [x] 채점 및 피드백 (강사)
- [x] 마감일 관리, 지각 제출 처리

#### 결제 시스템
- [x] 토스페이먼츠 연동
- [x] 결제 승인/검증
- [x] 결제 완료 시 자동 수강 등록
- [x] 환불 처리
- [x] 결제 내역 조회

#### 3D 메타버스
- [x] Three.js 기반 3D 환경 렌더링
- [x] Rapier 물리 엔진 (충돌, 중력)
- [x] 캐릭터 이동 (WASD, Shift 달리기)
- [x] 3인칭 카메라 (포인터 락)
- [x] 캐릭터 애니메이션 (Idle/Walk/Run)
- [x] GLTF/GLB 모델 로딩
- [x] 학교 맵 + 강의실 맵 (포탈 이동)

#### 화면 공유 (WebRTC)
- [x] 강사 → 학생 화면 공유
- [x] 학생 → 부모 화면 공유
- [x] TURN 서버 연동 (OpenRelay)
- [x] 드래그/리사이즈 가능 오버레이
- [x] 오디오 포함 공유

#### 실시간 통신
- [x] Socket.IO 연결 관리
- [x] 멀티플레이어 위치 동기화
- [x] 실시간 채팅 (방별)
- [x] 입장/퇴장 알림

#### 대시보드
- [x] 학생 대시보드 (수강 목록, 시간표, 통계)
- [x] 강사 대시보드 (담당 강의, 학생 수)
- [x] 관리자 대시보드 (시스템 통계, 관리 기능)
- [x] 학부모 대시보드 (자녀 정보, 참관 기능)

#### 관리자 패널
- [x] 사용자 관리 (검색, 역할 변경, 활성화/비활성화)
- [x] 강의 관리 (승인/반려)
- [x] 수강 관리
- [x] 결제 관리
- [x] 교실 관리

### 부분 구현 (50-80%)

| 기능 | 구현 상태 | 비고 |
|------|----------|------|
| 출석 관리 | 70% | API 있음, UI 일부 |
| 진도 관리 | 70% | API 있음, UI 일부 |
| 알림 시스템 | 60% | 기본 CRUD, 실시간 푸시 미완 |
| 화이트보드 | 50% | 기본 그리기, 동기화 불완전 |
| CCTV 시스템 | 40% | 구조만 존재, 실제 스트리밍 미완 |

### 미구현 (0%)

| 기능 | 원래 계획 | 비고 |
|------|----------|------|
| 아바타 커스터마이징 | O | 2차에서 구현 필요 |
| 음성 채팅 | O | 기본 구조만 있음 |
| 녹화/VOD | O | 미구현 |
| 비밀번호 재설정 | O | 이메일 발송 미구현 |
| 실시간 퀴즈 | X | 추가 기능 |

---

## 4. 미구현 기능 목록

### 원래 계획에 있었으나 미구현된 기능

#### 학생 기능
1. **비밀번호 재설정** - 이메일 발송 시스템 필요
2. **녹화 강의 시청** - VOD 시스템 미구현
3. **실시간 질문/답변** - 채팅으로 대체

#### 강사 기능
1. **일괄 출석 처리** - 개별 처리만 가능
2. **일괄 진도 업데이트** - 개별 처리만 가능
3. **강의 녹화** - 미구현
4. **실시간 퀴즈 출제** - 미구현

#### 관리자 기능
1. **시스템 모니터링** - 기본 통계만 제공
2. **로그 관리** - 미구현
3. **백업 관리** - Supabase 자동 백업에 의존

#### 학부모 기능
1. **과제 점수 상세 확인** - 기본 정보만 표시
2. **학습 리포트** - 미구현

#### 메타버스 기능
1. **아바타 커스터마이징** - 단일 캐릭터만 사용
2. **아바타 악세서리/의상** - 미구현
3. **인터랙티브 오브젝트** - 문만 구현
4. **NPC** - 미구현
5. **음성 채팅** - 구조만 있음

---

## 5. 디렉토리 구조

```
verseUp/
├── src/                          # 프론트엔드 소스
│   ├── components/               # React 컴포넌트
│   │   ├── admin/               # 관리자 컴포넌트 (5개)
│   │   ├── assignment/          # 과제 컴포넌트 (1개)
│   │   ├── course/              # 강의 컴포넌트 (4개)
│   │   ├── dashboard/           # 대시보드 컴포넌트 (5개)
│   │   ├── instructor/          # 강사 컴포넌트 (3개)
│   │   ├── layout/              # 레이아웃 컴포넌트 (2개)
│   │   ├── metaverse/           # 3D 메타버스 컴포넌트 (18개)
│   │   ├── parent/              # 학부모 컴포넌트 (2개)
│   │   └── student/             # 학생 컴포넌트 (2개)
│   ├── hooks/                   # 커스텀 훅
│   │   ├── useAuth.js
│   │   ├── useChat.js
│   │   ├── useScreenShare.js
│   │   ├── useScreenReceive.js
│   │   ├── useStudentScreen.js
│   │   ├── useVoiceChat.js
│   │   └── ...
│   ├── pages/                   # 페이지 컴포넌트 (22개)
│   ├── services/                # API 및 서비스
│   │   ├── api.js              # Axios 인스턴스
│   │   ├── socket.js           # Socket.IO 클라이언트
│   │   └── cctvService.js      # CCTV 서비스
│   ├── stores/                  # Zustand 스토어
│   │   └── authStore.js
│   ├── lib/                     # 라이브러리 초기화
│   │   └── supabase.js
│   ├── utils/                   # 유틸리티
│   │   ├── constants.js
│   │   └── webrtc.js           # ICE 서버 설정
│   └── App.jsx                  # 메인 앱 (라우팅)
│
├── server/                      # 백엔드 소스
│   ├── routes/                  # API 라우트 (18개)
│   │   ├── auth.js
│   │   ├── courses.js
│   │   ├── assignments.js
│   │   ├── payments.js
│   │   ├── materials.js
│   │   ├── notifications.js
│   │   ├── invites.js
│   │   ├── attendance.js
│   │   ├── progress.js
│   │   ├── parents.js
│   │   ├── classrooms.js
│   │   └── admin/              # 관리자 라우트 (6개)
│   ├── sockets/                 # Socket.IO 핸들러
│   │   └── index.js            # 900줄 규모
│   ├── middleware/              # 미들웨어
│   │   └── auth.js
│   ├── utils/                   # 서버 유틸리티
│   │   └── supabase.js
│   └── server.js               # Express 서버 진입점
│
├── public/                      # 정적 파일
│   └── models/                  # 3D 모델 (GLTF/GLB)
│       ├── BaseCharacter.gltf
│       ├── school_map.glb
│       └── classroom.glb
│
└── 설정 파일들
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── .env.example
    └── CLAUDE.md               # 개발 가이드
```

---

## 6. 데이터베이스 스키마

### 테이블 목록 (12개)

```sql
-- 1. 사용자 프로필
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('student', 'instructor', 'admin', 'parent')),
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 강의
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES profiles(id),
    classroom_id UUID REFERENCES classrooms(id),
    time_slot_id UUID REFERENCES time_slots(id),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    price NUMERIC DEFAULT 0,
    weeks INTEGER DEFAULT 1,
    max_students INTEGER DEFAULT 30,
    enrolled_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft', -- draft, published, archived
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 수강 등록
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    student_id UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'active', -- active, dropped
    enrolled_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id, student_id)
);

-- 4. 교실
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    capacity INTEGER DEFAULT 30,
    status TEXT DEFAULT 'available', -- available, occupied, maintenance
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 시간대
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms(id),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_order INTEGER,
    UNIQUE(classroom_id, day_of_week, start_time)
);

-- 6. 과제
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    instructor_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    max_score INTEGER DEFAULT 100,
    due_date TIMESTAMP,
    allow_late_submission BOOLEAN DEFAULT true,
    late_penalty_percent INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. 과제 제출
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id),
    student_id UUID REFERENCES profiles(id),
    content TEXT,
    file_url TEXT,
    file_name TEXT,
    status TEXT DEFAULT 'submitted', -- submitted, late, graded
    score INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT NOW(),
    graded_at TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- 8. 결제
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    course_id UUID REFERENCES courses(id),
    order_id TEXT UNIQUE NOT NULL,
    payment_key TEXT,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
    method TEXT, -- card, transfer, etc
    order_name TEXT,
    approved_at TIMESTAMP,
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. 강의 자료
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    week_number INTEGER,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. 알림
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. 부모-학생 연결
CREATE TABLE parent_student_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES profiles(id),
    student_id UUID REFERENCES profiles(id),
    invite_code TEXT,
    status TEXT DEFAULT 'pending', -- pending, active
    code_expires_at TIMESTAMP,
    linked_at TIMESTAMP,
    UNIQUE(parent_id, student_id)
);

-- 12. 출석
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    student_id UUID REFERENCES profiles(id),
    session_date DATE NOT NULL,
    check_in_time TIMESTAMP,
    status TEXT DEFAULT 'absent', -- present, absent, late
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id, student_id, session_date)
);

-- 13. 진도
CREATE TABLE progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    student_id UUID REFERENCES profiles(id),
    progress_percent NUMERIC DEFAULT 0,
    completed_weeks INTEGER[] DEFAULT '{}',
    current_week INTEGER DEFAULT 1,
    last_updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id, student_id)
);
```

### 주요 관계도

```
profiles (사용자)
    ├─< courses (강사가 생성)
    ├─< enrollments (학생이 수강)
    ├─< payments (결제)
    ├─< assignments (강사가 출제)
    ├─< assignment_submissions (학생이 제출)
    ├─< notifications (알림 수신)
    ├─< attendance (출석 기록)
    ├─< progress (진도 기록)
    └─< parent_student_links (부모-자녀)

courses (강의)
    ├── instructor_id → profiles
    ├── classroom_id → classrooms
    ├── time_slot_id → time_slots
    ├─< enrollments
    ├─< assignments
    ├─< materials
    ├─< attendance
    └─< progress

classrooms (교실)
    └─< time_slots
```

---

## 7. API 엔드포인트 목록

### 인증 (auth.js)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | /api/auth/me | 현재 사용자 정보 | O |
| POST | /api/auth/register-parent | 부모 계정 가입 | X |
| DELETE | /api/auth/account | 계정 삭제 | O |

### 강의 (courses.js)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | /api/courses | 강의 목록 (검색/필터) | X |
| GET | /api/courses/my | 내 담당 강의 (강사) | O |
| GET | /api/courses/:id | 강의 상세 | X |
| GET | /api/courses/:id/enrollment-status | 수강 상태 | O |
| GET | /api/courses/:id/check-access | 강의실 접근 권한 | O |
| POST | /api/courses | 강의 생성 | O (강사) |
| POST | /api/courses/:id/enroll | 수강 신청 | O |
| POST | /api/courses/:id/drop | 수강 취소 | O |
| PUT | /api/courses/:id | 강의 수정 | O (강사) |
| DELETE | /api/courses/:id | 강의 삭제 | O (강사) |

### 과제 (assignments.js)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | /api/courses/:courseId/assignments | 과제 목록 | O |
| GET | /api/assignments/:id | 과제 상세 | O |
| POST | /api/courses/:courseId/assignments | 과제 생성 | O (강사) |
| PUT | /api/assignments/:id | 과제 수정 | O (강사) |
| DELETE | /api/assignments/:id | 과제 삭제 | O (강사) |
| POST | /api/assignments/:id/upload | 파일 업로드 | O |
| POST | /api/assignments/:id/submit | 과제 제출 | O (학생) |
| GET | /api/assignments/:id/submissions | 제출 목록 | O (강사) |
| PUT | /api/submissions/:id/grade | 채점 | O (강사) |

### 결제 (payments.js)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | /api/payments/confirm | 결제 승인 | O |
| GET | /api/payments/history | 결제 내역 | O |
| POST | /api/payments/refund | 환불 처리 | O (관리자) |

### 자료 (materials.js)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | /api/materials | 자료 목록 | O |
| POST | /api/materials | 자료 업로드 | O (강사) |
| DELETE | /api/materials/:id | 자료 삭제 | O (강사) |

### 초대 코드 (invites.js)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | /api/invites/generate | 초대 코드 생성 | O (학생) |
| GET | /api/invites/my | 내 초대 코드 | O |
| GET | /api/invites/status/:code | 코드 상태 확인 | X |

### 출석 (attendance.js)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | /api/attendance | 출석 목록 | O |
| POST | /api/attendance/check-in | 출석 체크 | O |

### 진도 (progress.js)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | /api/progress | 진도 조회 | O |
| PUT | /api/progress/:id | 진도 업데이트 | O (강사) |

### 학부모 (parents.js)
| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | /api/parents/children | 자녀 목록 | O (부모) |
| POST | /api/parents/children/link | 자녀 연결 | O (부모) |

### 관리자 API (admin/*.js)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/admin/users | 사용자 목록 |
| PUT | /api/admin/users/:id | 사용자 수정 |
| DELETE | /api/admin/users/:id | 사용자 삭제 |
| GET | /api/admin/stats | 시스템 통계 |
| GET | /api/admin/courses | 강의 관리 |
| GET | /api/admin/enrollments | 수강 관리 |
| GET | /api/admin/payments | 결제 관리 |
| GET | /api/admin/classrooms | 교실 관리 |

---

## 8. Socket.IO 이벤트 목록

### 연결 관리
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `connect` | S→C | 연결 성공 |
| `disconnect` | S→C | 연결 종료 |
| `ping` | C→S | Keep-alive |
| `pong` | S→C | Keep-alive 응답 |

### 사용자/방 관리
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `user:join` | C→S | 사용자 입장 |
| `user:joined` | S→C | 입장 확인 |
| `room:join` | C→S | 방 입장 |
| `room:leave` | C→S | 방 퇴장 |
| `room:users` | S→C | 방 사용자 목록 |
| `room:user-joined` | S→C | 새 사용자 입장 알림 |
| `room:user-left` | S→C | 사용자 퇴장 알림 |

### 위치 동기화
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `player:move` | C→S | 위치 업데이트 |
| `player:moved` | S→C | 다른 플레이어 위치 |
| `location:change` | C→S | 위치 변경 (학교/강의실) |
| `location:entered` | S→C | 입장 알림 |

### 채팅
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `chat:message` | C→S | 메시지 전송 |
| `chat:message` | S→C | 메시지 수신 |

### 화면 공유 (강사)
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `screenshare:start` | C→S | 화면 공유 시작 |
| `screenshare:started` | S→C | 공유 시작 알림 |
| `screenshare:stop` | C→S | 화면 공유 중지 |
| `screenshare:stopped` | S→C | 공유 중지 알림 |
| `screenshare:offer` | C→S→C | WebRTC Offer |
| `screenshare:answer` | C→S→C | WebRTC Answer |
| `screenshare:ice-candidate` | C→S→C | ICE Candidate |

### 학생 화면 공유 (부모에게)
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `student:screen-consent` | C→S | 공유 동의 |
| `student:screen-start` | C→S | 공유 시작 |
| `student:screen-started` | S→C | 공유 시작 알림 |
| `student:screen-stop` | C→S | 공유 중지 |
| `student:screen-stopped` | S→C | 공유 중지 알림 |
| `student:screen-request` | C→S | 부모가 화면 요청 |
| `student:screen-offer` | C→S→C | WebRTC Offer |
| `student:screen-answer` | C→S→C | WebRTC Answer |
| `student:screen-ice` | C→S→C | ICE Candidate |

### 화이트보드
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `whiteboard:start` | C→S | 화이트보드 시작 |
| `whiteboard:started` | S→C | 시작 알림 |
| `whiteboard:draw` | C→S→C | 그리기 데이터 |
| `whiteboard:clear` | C→S | 지우기 |
| `whiteboard:cleared` | S→C | 지우기 알림 |
| `whiteboard:stop` | C→S | 종료 |
| `whiteboard:stopped` | S→C | 종료 알림 |

### 학부모 참관
| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `parent:watch-student` | C→S | 자녀 관찰 시작 |
| `parent:unwatch-student` | C→S | 자녀 관찰 종료 |
| `student:location-update` | C→S | 학생 위치 업데이트 |
| `student:location` | S→C | 학생 위치 (부모에게) |

---

## 9. 핵심 컴포넌트 설명

### 3D 메타버스 컴포넌트

#### MetaverseScene.jsx
- Three.js Canvas 컨테이너
- Rapier Physics 월드 설정
- 조명, 하늘, 안개 구성

```jsx
<Canvas>
  <Physics gravity={[0, -20, 0]}>
    <MapModel />
    <Player />
    <OtherPlayers />
    <Screen videoStream={teacherStream} />
  </Physics>
  <ThirdPersonCamera />
</Canvas>
```

#### Player.jsx
- 캐릭터 물리 제어
- 키보드 입력 처리 (WASD, Shift)
- 위치/회전 Socket 동기화

**물리 설정:**
```javascript
const PLAYER_CONFIG = {
  capsuleHalfHeight: 0.8,
  capsuleRadius: 0.52,
  walkSpeed: 8,
  runSpeed: 18,
  stepUpSpeed: 4,
  startPosition: [0, 2, 0]
}
```

#### CharacterModel.jsx
- GLTF 모델 로딩 (`BaseCharacter.gltf`)
- 애니메이션 전환 (Idle ↔ Walk ↔ Run)

```javascript
const { scene, animations } = useGLTF('/models/BaseCharacter.gltf')
const { actions } = useAnimations(animations, group)

// 애니메이션 이름으로 찾기 (인덱스 X)
const idleAction = actions['Idle']
const walkAction = actions['Walk']
```

### WebRTC 관련 훅

#### useScreenShare.js (강사용)
- 화면 캡처 (`getDisplayMedia`)
- 학생들에게 WebRTC 연결
- TURN 서버 설정 포함

#### useScreenReceive.js (학생용)
- 강사 화면 수신
- RTCPeerConnection 관리

#### utils/webrtc.js
- ICE 서버 설정 중앙화
- Google STUN + OpenRelay TURN

```javascript
export function getIceServers() {
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:443', username: '...', credential: '...' }
  ]
}
```

### 인증/상태 관리

#### stores/authStore.js (Zustand)
```javascript
const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}))
```

#### services/api.js (Axios)
- 인터셉터로 JWT 자동 주입
- 401 에러 시 로그아웃 처리

---

## 10. 2차 마이그레이션 가이드

### 프론트엔드 변경사항

#### 유지 가능 (그대로 사용)
- 모든 React 컴포넌트 구조
- 3D 메타버스 코드 전체
- Tailwind CSS 스타일링
- Zustand 상태 관리

#### 수정 필요
1. **API 호출** (`services/api.js`)
   - 엔드포인트 URL 변경
   - 응답 형식에 맞게 수정

2. **인증 방식** (`stores/authStore.js`)
   - Spring Security JWT 형식에 맞게 조정

3. **Socket.IO → WebSocket**
   - Spring WebSocket + STOMP 형식으로 변경

### 백엔드 마이그레이션 (Express → Spring)

#### 라우트 → Controller
```java
// Express
router.get('/api/courses', coursesController.getAll)

// Spring
@RestController
@RequestMapping("/api/courses")
public class CourseController {
    @GetMapping
    public List<Course> getAll() { ... }
}
```

#### 미들웨어 → Filter/Interceptor
```java
// Express authMiddleware
// → Spring Security Filter Chain

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        http.authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .requestMatchers("/api/courses/my").hasRole("INSTRUCTOR")
            .anyRequest().authenticated()
        );
        return http.build();
    }
}
```

#### Supabase Client → JPA Repository
```java
// Express + Supabase
const { data } = await supabase.from('courses').select('*')

// Spring + JPA
@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {
    List<Course> findByInstructorId(UUID instructorId);
    List<Course> findByStatus(String status);
}
```

### 데이터베이스 마이그레이션

#### 스키마 변환
1. Supabase 테이블 → JPA Entity 클래스
2. RLS 정책 → Spring Security 권한 체크
3. UUID 타입 유지 권장

#### Entity 예시
```java
@Entity
@Table(name = "courses")
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instructor_id")
    private Profile instructor;

    // ...
}
```

### 실시간 통신 마이그레이션

#### Socket.IO → Spring WebSocket
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").withSockJS();
    }
}

@Controller
public class ChatController {
    @MessageMapping("/chat.send")
    @SendTo("/topic/room/{roomId}")
    public ChatMessage send(ChatMessage message) {
        return message;
    }
}
```

---

## 부록: 파일 목록

### 주요 설정 파일
- `package.json` - 의존성 목록
- `vite.config.js` - Vite 설정 (프록시 포함)
- `tailwind.config.js` - Tailwind 설정
- `.env.example` - 환경변수 템플릿
- `CLAUDE.md` - 개발 가이드

### 문서 파일
- `README.md` - 기본 README
- `PARENT_ACCOUNT_SYSTEM.md` - 학부모 시스템 문서
- `WEBRTC_SCREEN_SHARE.md` - 화면 공유 구현 문서
- `SUPABASE_SETUP.md` - Supabase 설정 가이드
- `PAYMENT_GUIDE.md` - 결제 시스템 가이드

---

*이 문서는 2차 프로젝트 개발 시 참조용으로 작성되었습니다.*
*마지막 업데이트: 2025.12.XX*
