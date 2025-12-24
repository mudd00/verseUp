# 부모 계정 시스템 설계 문서

## 📑 목차

1. [개요](#개요)
2. [요구사항](#요구사항)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [데이터베이스 설계](#데이터베이스-설계)
5. [백엔드 API 설계](#백엔드-api-설계)
6. [프론트엔드 설계](#프론트엔드-설계)
7. [구현 로드맵](#구현-로드맵)
8. [보안 설계](#보안-설계)
9. [테스트 계획](#테스트-계획)

---

## 개요

### 목적
부모가 자녀의 학습 활동을 모니터링할 수 있는 시스템을 구축하여, 학부모의 자녀 학습 관리를 지원하고 교육 참여도를 높입니다.

### 핵심 가치
- **투명성**: 자녀의 학습 현황을 실시간으로 확인
- **안전성**: 초대 코드 기반 연결로 프라이버시 보호
- **편의성**: 종합적인 학습 데이터를 한 곳에서 조회

### 주요 기능
1. **초대 코드 기반 연결**: 학생이 생성한 코드로 부모 계정 연결
2. **학업 모니터링**: 수강 강의, 과제, 성적, 출석 확인
3. **진도율 추적**: 강의별 학습 진행 상황 시각화
4. **성적 관리**: 과제 점수 및 피드백 확인
5. **실시간 수업 참관**: 메타버스 교실 CCTV로 자녀 수업 실시간 관찰

---

## 요구사항

### 기능 요구사항

#### FR-1: 부모-자녀 연결
- FR-1.1: 학생이 초대 코드를 생성할 수 있어야 함
- FR-1.2: 초대 코드는 8자리 영숫자 (혼동 문자 제외)
- FR-1.3: 초대 코드는 7일 후 자동 만료
- FR-1.4: 부모는 초대 코드로만 가입 가능
- FR-1.5: 학생은 언제든 부모 연결을 해제할 수 있음

#### FR-2: 부모 계정 관리
- FR-2.1: 부모는 별도의 회원가입 페이지에서 가입
- FR-2.2: 부모는 여러 자녀를 연결할 수 있음
- FR-2.3: 한 자녀에 여러 부모 연결 가능 (이혼 가정 지원)
- FR-2.4: 부모는 자녀별 닉네임을 설정할 수 있음

#### FR-3: 학업 데이터 조회
- FR-3.1: 부모는 자녀의 수강 강의 목록을 조회할 수 있음
- FR-3.2: 부모는 자녀의 주간 시간표를 확인할 수 있음
- FR-3.3: 부모는 자녀의 과제 제출 현황을 확인할 수 있음
- FR-3.4: 부모는 자녀의 과제 성적 및 피드백을 확인할 수 있음

#### FR-4: 출석 관리
- FR-4.1: 강사가 학생의 출석을 체크할 수 있음
- FR-4.2: 부모는 자녀의 출석 기록을 확인할 수 있음
- FR-4.3: 출석률이 자동으로 계산됨
- FR-4.4: 출석 상태: 출석, 결석, 지각, 사유

#### FR-5: 진도율 추적
- FR-5.1: 강의별 진도율이 자동으로 계산됨
- FR-5.2: 주차별 학습 완료 현황을 추적
- FR-5.3: 학습 자료 완료율을 표시
- FR-5.4: 마지막 활동 시간을 기록

#### FR-6: 실시간 수업 참관 (CCTV)
- FR-6.1: 각 교실에 1개의 고정 CCTV 카메라 설치 (후방)
  - 위치: 교실 뒤쪽 천장
  - 시점: 칠판/교탁 방향 (학생들의 뒷모습 + 강사/칠판)
- FR-6.2: 부모는 자녀가 수업 중인 교실의 CCTV를 시청할 수 있음
- FR-6.3: 자녀가 해당 교실에 있을 때만 시청 가능 (privacy)
- FR-6.4: 부모는 음성을 들을 수 없음 (영상만 제공, 프라이버시 보호)
- FR-6.5: 동시에 여러 부모가 같은 교실 CCTV 시청 가능
- FR-6.6: 부모 시청 시 학생에게 알림 표시 (선택적)
- FR-6.7: 강사가 CCTV 스트리밍을 활성화/비활성화할 수 있음

#### FR-7: 학생 화면 공유 (부모에게 보여주기)
- FR-7.1: **학생이 동의해야만** 부모가 화면을 볼 수 있음 (옵트인 방식)
- FR-7.2: 학생이 "부모님께 화면 공유" 버튼을 눌러 활성화
- FR-7.3: 학생은 언제든 화면 공유를 중단할 수 있음
- FR-7.4: 부모는 자녀의 화면 공유 상태를 실시간으로 확인 가능
- FR-7.5: 부모는 CCTV와 학생 화면을 탭으로 전환하며 볼 수 있음
- FR-7.6: 학생 화면 시청 시에도 음성은 제공되지 않음
- FR-7.7: 용도: 자녀가 배운 내용, 만든 작품 등을 부모에게 자랑/공유

### 비기능 요구사항

#### NFR-1: 보안
- NFR-1.1: 모든 데이터 접근은 RLS로 제어
- NFR-1.2: 부모는 연결된 자녀의 데이터만 조회 가능
- NFR-1.3: API 레벨에서 추가 권한 검증 필요
- NFR-1.4: 초대 코드는 일회용

#### NFR-2: 성능
- NFR-2.1: 대시보드 로딩 시간 < 2초
- NFR-2.2: API 응답 시간 < 500ms
- NFR-2.3: 동시 접속 1000명 지원

#### NFR-3: 사용성
- NFR-3.1: 모바일 반응형 UI
- NFR-3.2: 직관적인 네비게이션
- NFR-3.3: 다크 테마 지원

#### NFR-4: CCTV 스트리밍 성능
- NFR-4.1: 영상 지연 시간 < 3초
- NFR-4.2: 최소 720p 해상도 지원
- NFR-4.3: 교실당 최대 50명 동시 시청 지원
- NFR-4.4: 네트워크 불안정 시 자동 화질 조절

---

## 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      프론트엔드 (React)                       │
├─────────────────────────────────────────────────────────────┤
│  RegisterParent.jsx  │  ParentDashboard.jsx  │  Profile.jsx │
│  InviteCodeManager   │  ChildSelector        │  CourseList  │
│  AttendanceView      │  ProgressTracker      │  GradeReport │
│  ClassroomObserver   │  CCTVViewer           │              │
└──────────────────┬──────────────────────────────────────────┘
                   │ REST API (JWT)
┌──────────────────┴──────────────────────────────────────────┐
│                     백엔드 (Express)                          │
├─────────────────────────────────────────────────────────────┤
│  /api/invites/*     │  /api/parents/*     │  /api/attendance│
│  - generate         │  - children         │  - course/:id   │
│  - validate         │  - dashboard        │  - student/:id  │
│  - revoke           │  - courses          │  - bulk         │
│                     │  - assignments      │                 │
│                     │  - observe/:classId │                 │
├─────────────────────────────────────────────────────────────┤
│  Socket.IO Events (CCTV 스트리밍)                             │
│  - cctv:request     │  cctv:stream        │  cctv:stop      │
│  - cctv:viewers     │  cctv:child-status  │                 │
└──────────────────┬──────────────────────────────────────────┘
                   │ SQL + RLS
┌──────────────────┴──────────────────────────────────────────┐
│                   데이터베이스 (Supabase)                     │
├─────────────────────────────────────────────────────────────┤
│  profiles              │  parent_student_links              │
│  enrollments           │  attendance                        │
│  assignments           │  course_progress                   │
│  assignment_submissions│  courses                           │
└─────────────────────────────────────────────────────────────┘
```

### 인증 흐름

```
1. 학생 초대 코드 생성
   Student → POST /api/invites/generate
   → DB: INSERT parent_student_links (status='pending')
   → Response: { inviteCode: "ABC12XYZ" }

2. 부모 회원가입
   Parent → POST /api/invites/validate { code }
   → DB: SELECT parent_student_links WHERE invite_code
   → Response: { valid: true, studentInfo }

   Parent → POST /api/auth/register-parent { code, email, password }
   → Supabase: Create user (role='parent')
   → DB: UPDATE parent_student_links (status='active', parent_id)
   → Response: { user, token }

3. 부모 데이터 조회
   Parent → GET /api/parents/children/:studentId/courses
   → authMiddleware: Verify JWT
   → requireParent: Check role='parent'
   → validateParentStudentLink: Verify active link
   → Supabase: Query with RLS filtering
   → Response: { courses: [...] }
```

### CCTV 참관 시스템 흐름

```
1. 부모가 자녀 위치 확인
   Parent → GET /api/parents/children/:studentId/location
   → Response: { isInClassroom: true, classroomId: "classroom-A", classroomName: "강의실 A" }

2. CCTV 시청 권한 확인 및 요청
   Parent → Socket.IO: cctv:request { classroomId, studentId }
   → Server: 부모-자녀 연결 확인 + 자녀 위치 확인
   → Server → Parent: cctv:authorized { classroomId, streamUrl }
   (또는 cctv:denied { reason: "자녀가 해당 교실에 없습니다" })

3. CCTV 스트림 수신 (WebRTC)
   Server → Parent: cctv:stream { offer }
   Parent → Server: cctv:answer { answer }
   → WebRTC 연결 수립
   → 부모 화면에 교실 CCTV 영상 표시

4. 강사 CCTV 제어
   Instructor → Socket.IO: cctv:toggle { classroomId, enabled: false }
   → Server → All Parents: cctv:stopped { classroomId, reason: "강사가 비활성화함" }

5. 시청자 알림 (선택적)
   Server → Classroom Students: cctv:viewer-joined { viewerCount: 3 }
   → 학생 화면에 "👁️ 3명 참관 중" 표시
```

### CCTV 카메라 구조 (메타버스)

```
┌─────────────────────────────────────────────────────────────┐
│                      메타버스 교실                            │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                      칠판                             │   │
│   └─────────────────────────────────────────────────────┘   │
│                        🎓 교탁                               │
│                                                              │
│        💺  💺  💺  💺  💺  💺                              │
│        💺  💺  💺  💺  💺  💺  ← 학생 좌석                  │
│        💺  💺  💺  💺  💺  💺                              │
│                                                              │
│                         📹                                   │
│                     CCTV 카메라                              │
│                  (교실 뒤쪽 천장)                            │
│                  → 칠판/교탁 방향                            │
└─────────────────────────────────────────────────────────────┘

카메라 상세:
┌─────────────┬──────────────────────┬─────────────────────────┐
│ 카메라 ID    │ 위치                  │ 시점                     │
├─────────────┼──────────────────────┼─────────────────────────┤
│ cam_back    │ 교실 뒤쪽 천장         │ 칠판/교탁 방향           │
└─────────────┴──────────────────────┴─────────────────────────┘

※ 추후 필요시 전방 카메라 추가 가능 (확장성 고려)
```

### 학생 화면 공유 참관 (동의 기반)

```
┌─────────────────────────────────────────────────────────────┐
│  1. 학생이 책상에 앉음 → 화면 공유 시작 (강사용)                │
│  2. 학생이 "부모님께 화면 공유" 버튼 클릭 → 부모에게 공유 시작    │
│                                                              │
│  ┌──────────────┐     Socket.IO      ┌──────────────┐       │
│  │   학생 PC     │ ──────────────────► │    서버      │       │
│  │  (화면 공유)   │  parent:screen     │              │       │
│  │              │  -consent: true     │              │       │
│  └──────────────┘                     └──────┬───────┘       │
│         │                                    │               │
│         │ [부모님께 화면 공유] 버튼            │               │
│         │ (학생이 직접 클릭)                   │               │
│         ▼                                    ▼               │
│  ┌──────────────┐                   ┌──────────────┐        │
│  │ 👨‍👩‍👧 공유 중  │                   │   부모 PC     │        │
│  │ 👁️ 1명 시청   │                   │  (시청 가능)   │        │
│  └──────────────┘                   └──────────────┘        │
│                                                              │
│  학생 화면:                          부모 화면:               │
│  ┌─────────────────┐               ┌─────────────────────┐  │
│  │ 부모님께 공유 중  │               │ [CCTV] [자녀 화면]   │  │
│  │ 👁️ 1명 시청 중   │               │ ┌─────────────────┐ │  │
│  │ [공유 중지]      │               │ │ 📺 자녀 화면     │ │  │
│  └─────────────────┘               │ │   공유 영상      │ │  │
│                                    │ └─────────────────┘ │  │
│                                    └─────────────────────┘  │
│                                                              │
│  ※ 학생이 "부모님께 화면 공유" 버튼을 누르지 않으면             │
│     부모는 자녀 화면을 볼 수 없음 (프라이버시 보호)             │
└─────────────────────────────────────────────────────────────┘
```

---

## 데이터베이스 설계

### ERD

```
┌─────────────────┐
│    profiles     │
├─────────────────┤
│ id (PK)         │
│ email           │
│ name            │
│ role ←──────────┼─── 'parent' 추가
│ avatar_url      │
│ created_at      │
└────────┬────────┘
         │
         │ (parent_id, student_id)
         │
    ┌────┴──────────────────────┐
    │                            │
┌───▼──────────────────┐  ┌─────▼──────────┐
│ parent_student_links │  │  enrollments   │
├──────────────────────┤  ├────────────────┤
│ id (PK)              │  │ id (PK)        │
│ parent_id (FK)       │  │ student_id (FK)│
│ student_id (FK)      │  │ course_id (FK) │
│ invite_code (UNIQUE) │  │ status         │
│ status               │  └────────┬───────┘
│ code_expires_at      │           │
│ accepted_at          │           │
│ student_nickname     │      ┌────▼────────────────┐
└──────────────────────┘      │  course_progress    │
                              ├─────────────────────┤
┌──────────────────┐          │ id (PK)             │
│   attendance     │          │ enrollment_id (FK)  │
├──────────────────┤          │ student_id (FK)     │
│ id (PK)          │          │ course_id (FK)      │
│ student_id (FK)  │          │ current_week        │
│ course_id (FK)   │          │ completed_weeks[]   │
│ session_date     │          │ completion_percent  │
│ week_number      │          │ last_activity_at    │
│ status           │          └─────────────────────┘
│ check_in_time    │
└──────────────────┘
```

### 테이블 상세

#### parent_student_links

| 컬럼명 | 타입 | 제약 | 설명 |
|-------|------|------|------|
| id | UUID | PK | 고유 식별자 |
| parent_id | UUID | FK → profiles(id) | 부모 계정 |
| student_id | UUID | FK → profiles(id) | 학생 계정 |
| invite_code | TEXT | UNIQUE, NOT NULL | 8자리 초대 코드 |
| status | TEXT | CHECK | 'pending', 'active', 'revoked' |
| code_expires_at | TIMESTAMPTZ | NOT NULL | 만료 시간 (생성 + 7일) |
| accepted_at | TIMESTAMPTZ | NULL | 수락 시간 |
| student_nickname | TEXT | NULL | 부모가 설정한 자녀 별명 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 시간 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 시간 |

**제약 조건**:
- UNIQUE(parent_id, student_id): 중복 연결 방지
- INDEX(invite_code): 빠른 검색
- INDEX(parent_id, status): 활성 링크 조회 최적화

#### attendance

| 컬럼명 | 타입 | 제약 | 설명 |
|-------|------|------|------|
| id | UUID | PK | 고유 식별자 |
| student_id | UUID | FK → profiles(id) | 학생 |
| course_id | UUID | FK → courses(id) | 강의 |
| session_date | DATE | NOT NULL | 수업 날짜 |
| week_number | INTEGER | CHECK (1-10) | 주차 |
| status | TEXT | CHECK | 'present', 'absent', 'late', 'excused' |
| notes | TEXT | NULL | 비고 |
| check_in_time | TIMESTAMPTZ | NULL | 체크인 시간 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 시간 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 시간 |

**제약 조건**:
- UNIQUE(student_id, course_id, session_date): 중복 출석 방지
- INDEX(student_id, course_id): 출석 조회 최적화

#### course_progress

| 컬럼명 | 타입 | 제약 | 설명 |
|-------|------|------|------|
| id | UUID | PK | 고유 식별자 |
| enrollment_id | UUID | FK → enrollments(id) | 수강 신청 |
| student_id | UUID | FK → profiles(id) | 학생 |
| course_id | UUID | FK → courses(id) | 강의 |
| current_week | INTEGER | DEFAULT 1 | 현재 주차 |
| completed_weeks | INTEGER[] | DEFAULT [] | 완료된 주차 목록 |
| total_materials | INTEGER | DEFAULT 0 | 전체 자료 수 |
| completed_materials | INTEGER | DEFAULT 0 | 완료한 자료 수 |
| completion_percentage | DECIMAL(5,2) | CHECK (0-100) | 완료율 |
| last_activity_at | TIMESTAMPTZ | NULL | 마지막 활동 시간 |
| total_study_hours | DECIMAL(10,2) | DEFAULT 0 | 총 학습 시간 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 시간 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 시간 |

**제약 조건**:
- UNIQUE(enrollment_id): 수강당 하나의 진도 기록

#### cctv_sessions

| 컬럼명 | 타입 | 제약 | 설명 |
|-------|------|------|------|
| id | UUID | PK | 고유 식별자 |
| classroom_id | TEXT | NOT NULL | 교실 ID (room:door1_enter 등) |
| is_enabled | BOOLEAN | DEFAULT true | CCTV 활성화 여부 |
| enabled_by | UUID | FK → profiles(id) | 활성화한 강사 |
| viewer_count | INTEGER | DEFAULT 0 | 현재 시청자 수 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 시간 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정 시간 |

**제약 조건**:
- UNIQUE(classroom_id): 교실당 하나의 CCTV 세션

#### cctv_view_logs (감사용, 선택적)

| 컬럼명 | 타입 | 제약 | 설명 |
|-------|------|------|------|
| id | UUID | PK | 고유 식별자 |
| parent_id | UUID | FK → profiles(id) | 시청한 부모 |
| student_id | UUID | FK → profiles(id) | 대상 자녀 |
| classroom_id | TEXT | NOT NULL | 교실 ID |
| started_at | TIMESTAMPTZ | DEFAULT NOW() | 시청 시작 시간 |
| ended_at | TIMESTAMPTZ | NULL | 시청 종료 시간 |
| duration_seconds | INTEGER | NULL | 시청 시간 (초) |

**용도**: 프라이버시 감사, 시청 기록 추적

### 함수 및 트리거

#### generate_invite_code()
```sql
-- 8자리 고유 초대 코드 생성
-- 혼동 문자 제외: 0, O, I, 1
-- 자동 중복 검사
RETURNS TEXT
```

#### get_attendance_rate(student_id, course_id)
```sql
-- 특정 학생의 특정 강의 출석률 계산
-- (출석+지각) / 전체 세션 * 100
RETURNS DECIMAL
```

#### create_course_progress_on_enrollment()
```sql
-- enrollments INSERT/UPDATE 시 자동 실행
-- status='active'면 course_progress 자동 생성
TRIGGER
```

### RLS 정책

#### parent_student_links
```sql
-- 학생: 자신의 링크 조회/생성/취소
SELECT: student_id = auth.uid()
INSERT: student_id = auth.uid()
UPDATE: student_id = auth.uid()

-- 부모: 자신의 링크 조회/수정
SELECT: parent_id = auth.uid()
UPDATE: parent_id = auth.uid()
```

#### attendance
```sql
-- 학생: 자신의 출석 조회
SELECT: student_id = auth.uid()

-- 강사: 본인 강의 출석 관리
SELECT/INSERT/UPDATE:
  EXISTS (courses WHERE instructor_id = auth.uid())

-- 부모: 연결된 자녀 출석 조회
SELECT:
  EXISTS (parent_student_links
    WHERE parent_id = auth.uid() AND status = 'active')
```

#### course_progress
```sql
-- 학생: 자신의 진도 조회/수정
SELECT/UPDATE: student_id = auth.uid()

-- 강사: 본인 강의 진도 조회
SELECT:
  EXISTS (courses WHERE instructor_id = auth.uid())

-- 부모: 연결된 자녀 진도 조회
SELECT:
  EXISTS (parent_student_links
    WHERE parent_id = auth.uid() AND status = 'active')
```

#### enrollments, assignment_submissions 정책 추가
```sql
-- 부모: 연결된 자녀 데이터 조회
SELECT:
  EXISTS (parent_student_links
    WHERE parent_id = auth.uid() AND status = 'active')
```

#### cctv_sessions
```sql
-- 강사: 본인 수업 교실 CCTV 제어
SELECT/UPDATE:
  EXISTS (courses WHERE instructor_id = auth.uid())

-- 부모: 자녀가 있는 교실 CCTV 정보 조회
SELECT:
  EXISTS (
    SELECT 1 FROM parent_student_links psl
    JOIN student_locations sl ON sl.student_id = psl.student_id
    WHERE psl.parent_id = auth.uid()
      AND psl.status = 'active'
      AND sl.classroom_id = cctv_sessions.classroom_id
  )
```

#### cctv_view_logs
```sql
-- 부모: 본인 시청 기록만 조회
SELECT: parent_id = auth.uid()

-- 시스템: 로그 기록 (서버에서만)
INSERT: service_role 사용
```

---

## 백엔드 API 설계

### API 엔드포인트 목록

#### 초대 코드 관리 (/api/invites)

**POST /api/invites/generate**
- **인증**: 필요 (학생 role)
- **설명**: 부모 초대 코드 생성
- **요청**: -
- **응답**:
  ```json
  {
    "inviteCode": "ABC12XYZ",
    "expiresAt": "2025-12-31T23:59:59Z",
    "studentId": "uuid"
  }
  ```

**POST /api/invites/validate**
- **인증**: 불필요 (공개)
- **설명**: 초대 코드 유효성 검증
- **요청**:
  ```json
  {
    "inviteCode": "ABC12XYZ"
  }
  ```
- **응답**:
  ```json
  {
    "valid": true,
    "student": {
      "id": "uuid",
      "name": "홍길동",
      "email": "student@test.com"
    },
    "expiresAt": "2025-12-31T23:59:59Z"
  }
  ```

**GET /api/invites/my**
- **인증**: 필요 (학생 role)
- **설명**: 내가 생성한 초대 코드 목록
- **응답**:
  ```json
  {
    "invites": [
      {
        "id": "uuid",
        "inviteCode": "ABC12XYZ",
        "status": "pending",
        "expiresAt": "2025-12-31T23:59:59Z",
        "createdAt": "2025-12-24T10:00:00Z"
      }
    ]
  }
  ```

**DELETE /api/invites/:code**
- **인증**: 필요 (학생 role)
- **설명**: 초대 코드 취소
- **응답**:
  ```json
  {
    "message": "초대 코드가 취소되었습니다."
  }
  ```

#### 부모 인증 (/api/auth)

**POST /api/auth/register-parent**
- **인증**: 불필요
- **설명**: 초대 코드로 부모 계정 생성
- **요청**:
  ```json
  {
    "inviteCode": "ABC12XYZ",
    "name": "부모이름",
    "email": "parent@test.com",
    "password": "password123"
  }
  ```
- **응답**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "parent@test.com",
      "name": "부모이름",
      "role": "parent"
    },
    "token": "jwt_token",
    "student": {
      "id": "uuid",
      "name": "홍길동"
    }
  }
  ```

#### 부모 데이터 접근 (/api/parents)

**GET /api/parents/children**
- **인증**: 필요 (부모 role)
- **설명**: 연결된 자녀 목록
- **응답**:
  ```json
  {
    "children": [
      {
        "id": "uuid",
        "name": "홍길동",
        "email": "student@test.com",
        "nickname": "첫째",
        "linkedAt": "2025-12-24T10:00:00Z",
        "stats": {
          "activeCourses": 3,
          "attendanceRate": 95.5,
          "pendingAssignments": 2,
          "averageGrade": 88.5
        }
      }
    ]
  }
  ```

**POST /api/parents/children/:studentId/nickname**
- **인증**: 필요 (부모 role + link 검증)
- **설명**: 자녀 닉네임 설정
- **요청**:
  ```json
  {
    "nickname": "첫째"
  }
  ```

**DELETE /api/parents/children/:linkId**
- **인증**: 필요 (부모 role)
- **설명**: 부모-자녀 연결 해제
- **응답**:
  ```json
  {
    "message": "연결이 해제되었습니다."
  }
  ```

**GET /api/parents/children/:studentId/dashboard**
- **인증**: 필요 (부모 role + link 검증)
- **설명**: 자녀 대시보드 데이터
- **응답**:
  ```json
  {
    "student": {
      "id": "uuid",
      "name": "홍길동",
      "email": "student@test.com"
    },
    "stats": {
      "activeCourses": 3,
      "totalAssignments": 15,
      "completedAssignments": 12,
      "pendingAssignments": 2,
      "overdueAssignments": 1,
      "attendanceRate": 95.5,
      "averageGrade": 88.5
    },
    "recentActivity": [
      {
        "type": "assignment_submitted",
        "title": "1주차 과제 제출",
        "timestamp": "2025-12-24T10:00:00Z"
      }
    ]
  }
  ```

**GET /api/parents/children/:studentId/courses**
- **인증**: 필요 (부모 role + link 검증)
- **설명**: 자녀의 수강 강의 목록
- **응답**:
  ```json
  {
    "courses": [
      {
        "id": "uuid",
        "title": "React 기초",
        "instructor": {
          "name": "김강사",
          "email": "instructor@test.com"
        },
        "progress": 65.5,
        "attendanceRate": 100,
        "averageGrade": 92,
        "status": "ongoing"
      }
    ]
  }
  ```

**GET /api/parents/children/:studentId/assignments**
- **인증**: 필요 (부모 role + link 검증)
- **쿼리**: ?courseId=uuid (선택)
- **설명**: 자녀의 과제 목록
- **응답**:
  ```json
  {
    "assignments": [
      {
        "id": "uuid",
        "title": "1주차 과제",
        "course": {
          "id": "uuid",
          "title": "React 기초"
        },
        "dueDate": "2025-12-31T23:59:59Z",
        "maxScore": 100,
        "submission": {
          "status": "graded",
          "score": 95,
          "feedback": "잘했습니다!",
          "submittedAt": "2025-12-30T10:00:00Z"
        }
      }
    ]
  }
  ```

**GET /api/parents/children/:studentId/progress**
- **인증**: 필요 (부모 role + link 검증)
- **설명**: 자녀의 진도율 데이터
- **응답**:
  ```json
  {
    "progress": [
      {
        "courseId": "uuid",
        "courseTitle": "React 기초",
        "currentWeek": 5,
        "completedWeeks": [1, 2, 3, 4],
        "completionPercentage": 65.5,
        "totalMaterials": 20,
        "completedMaterials": 13,
        "lastActivityAt": "2025-12-24T15:00:00Z"
      }
    ]
  }
  ```

**GET /api/parents/children/:studentId/attendance**
- **인증**: 필요 (부모 role + link 검증)
- **쿼리**: ?courseId=uuid, ?startDate, ?endDate
- **설명**: 자녀의 출석 기록
- **응답**:
  ```json
  {
    "attendance": [
      {
        "id": "uuid",
        "course": {
          "id": "uuid",
          "title": "React 기초"
        },
        "sessionDate": "2025-12-24",
        "weekNumber": 5,
        "status": "present",
        "checkInTime": "2025-12-24T09:05:00Z"
      }
    ],
    "stats": {
      "totalSessions": 20,
      "presentCount": 18,
      "absentCount": 1,
      "lateCount": 1,
      "attendanceRate": 95.0
    }
  }
  ```

#### 출석 관리 (/api/attendance)

**POST /api/attendance**
- **인증**: 필요 (강사 role)
- **설명**: 출석 체크
- **요청**:
  ```json
  {
    "courseId": "uuid",
    "studentId": "uuid",
    "sessionDate": "2025-12-24",
    "weekNumber": 5,
    "status": "present",
    "checkInTime": "2025-12-24T09:05:00Z",
    "notes": ""
  }
  ```

**POST /api/attendance/bulk**
- **인증**: 필요 (강사 role)
- **설명**: 일괄 출석 체크
- **요청**:
  ```json
  {
    "courseId": "uuid",
    "sessionDate": "2025-12-24",
    "weekNumber": 5,
    "attendance": [
      {
        "studentId": "uuid1",
        "status": "present"
      },
      {
        "studentId": "uuid2",
        "status": "absent"
      }
    ]
  }
  ```

**GET /api/attendance/course/:courseId**
- **인증**: 필요 (강사 role)
- **쿼리**: ?date=YYYY-MM-DD
- **설명**: 강의별 출석 조회

**GET /api/attendance/student/:studentId**
- **인증**: 필요 (학생/부모/강사 role)
- **쿼리**: ?courseId=uuid, ?startDate, ?endDate
- **설명**: 학생별 출석 조회

**PUT /api/attendance/:id**
- **인증**: 필요 (강사 role)
- **설명**: 출석 기록 수정

#### CCTV 참관 (/api/cctv)

**GET /api/parents/children/:studentId/location**
- **인증**: 필요 (부모 role + link 검증)
- **설명**: 자녀 현재 위치 및 화면 공유 상태 확인
- **응답**:
  ```json
  {
    "studentId": "uuid",
    "isOnline": true,
    "isInClassroom": true,
    "classroom": {
      "id": "room:door1_enter",
      "name": "강의실 A",
      "cctvEnabled": true,
      "viewerCount": 2
    },
    "screenShare": {
      "isSharing": true,
      "hasConsent": true,
      "startedAt": "2025-12-24T10:05:00Z"
    },
    "lastSeen": "2025-12-24T10:00:00Z"
  }
  ```

**GET /api/cctv/classrooms/:classroomId**
- **인증**: 필요 (부모 role)
- **설명**: 교실 CCTV 상태 조회
- **응답**:
  ```json
  {
    "classroomId": "room:door1_enter",
    "classroomName": "강의실 A",
    "isEnabled": true,
    "instructorName": "김강사",
    "viewerCount": 3,
    "canWatch": true,
    "reason": null
  }
  ```

**POST /api/cctv/classrooms/:classroomId/toggle**
- **인증**: 필요 (강사 role)
- **설명**: CCTV 활성화/비활성화
- **요청**:
  ```json
  {
    "enabled": false,
    "reason": "개인 상담 중"
  }
  ```
- **응답**:
  ```json
  {
    "success": true,
    "isEnabled": false,
    "message": "CCTV가 비활성화되었습니다."
  }
  ```

#### CCTV Socket.IO 이벤트 (단일 카메라)

**클라이언트 → 서버**:

| 이벤트 | 데이터 | 설명 |
|-------|--------|------|
| `cctv:request` | `{ classroomId, studentId }` | CCTV 시청 요청 |
| `cctv:answer` | `{ classroomId, answer }` | WebRTC answer |
| `cctv:ice-candidate` | `{ classroomId, candidate }` | ICE candidate |
| `cctv:stop` | `{ classroomId }` | 시청 종료 |
| `cctv:toggle` | `{ classroomId, enabled }` | 강사 CCTV 제어 |

**서버 → 클라이언트**:

| 이벤트 | 데이터 | 설명 |
|-------|--------|------|
| `cctv:authorized` | `{ classroomId }` | 시청 승인 |
| `cctv:denied` | `{ classroomId, reason }` | 시청 거부 |
| `cctv:offer` | `{ classroomId, offer }` | WebRTC offer |
| `cctv:ice-candidate` | `{ classroomId, candidate }` | ICE candidate |
| `cctv:stopped` | `{ classroomId, reason }` | 스트림 중단 알림 |
| `cctv:viewer-joined` | `{ classroomId, viewerCount }` | 시청자 입장 알림 |
| `cctv:viewer-left` | `{ classroomId, viewerCount }` | 시청자 퇴장 알림 |

#### 학생 화면 공유 참관 Socket.IO 이벤트 (학생 동의 필요)

**학생 클라이언트 → 서버**:

| 이벤트 | 데이터 | 설명 |
|-------|--------|------|
| `parent:screen-consent` | `{ enabled }` | 학생이 부모에게 화면 공유 동의/해제 |

**부모 클라이언트 → 서버**:

| 이벤트 | 데이터 | 설명 |
|-------|--------|------|
| `parent:screen-request` | `{ studentId }` | 자녀 화면 시청 요청 |
| `parent:screen-answer` | `{ studentId, answer }` | WebRTC answer |
| `parent:screen-stop` | `{ studentId }` | 화면 시청 종료 |

**서버 → 부모 클라이언트**:

| 이벤트 | 데이터 | 설명 |
|-------|--------|------|
| `parent:screen-authorized` | `{ studentId, isSharing, hasConsent }` | 시청 승인 (동의 여부 포함) |
| `parent:screen-denied` | `{ studentId, reason }` | 시청 거부 |
| `parent:screen-offer` | `{ studentId, offer }` | WebRTC offer (학생 화면) |
| `parent:screen-started` | `{ studentId, hasConsent }` | 자녀가 화면 공유 시작 (동의 포함) |
| `parent:screen-stopped` | `{ studentId }` | 자녀가 화면 공유 종료 |

**서버 → 학생 클라이언트**:

| 이벤트 | 데이터 | 설명 |
|-------|--------|------|
| `parent:viewer-count` | `{ count }` | 부모 시청자 수 (동의 시) |

### 미들웨어

#### validateParentStudentLink
```javascript
/**
 * 부모-자녀 연결 검증 미들웨어
 * req.params.studentId와 req.user.id (parent) 간 active link 확인
 */
async function validateParentStudentLink(req, res, next) {
  const parentId = req.user.id
  const studentId = req.params.studentId

  const { data: link, error } = await supabase
    .from('parent_student_links')
    .select('id, status, student_nickname')
    .eq('parent_id', parentId)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .single()

  if (error || !link) {
    return res.status(403).json({
      error: '이 학생의 정보를 조회할 권한이 없습니다.'
    })
  }

  req.parentStudentLink = link
  next()
}
```

#### requireParent
```javascript
/**
 * 부모 role 필수
 */
const requireParent = requireRole('parent')
```

---

## 프론트엔드 설계

### 라우팅

```
/register-parent          → RegisterParent.jsx (초대 코드 입력)
/dashboard                → ParentDashboard.jsx (role='parent'일 때)
/profile                  → Profile.jsx + InviteCodeManager
```

### 컴포넌트 구조

```
src/
├── pages/
│   ├── RegisterParent.jsx          # 부모 회원가입
│   ├── Dashboard.jsx               # role 분기
│   ├── Profile.jsx                 # 초대 코드 관리 섹션 추가
│   └── ClassroomObserver.jsx       # 부모 CCTV 시청 페이지
│
├── components/
│   ├── dashboard/
│   │   └── ParentDashboard.jsx     # 부모 메인 대시보드
│   │
│   ├── parent/
│   │   ├── ChildSelector.jsx       # 자녀 선택 드롭다운
│   │   ├── ChildCourseList.jsx     # 자녀 강의 목록
│   │   ├── AttendanceView.jsx      # 출석 캘린더
│   │   ├── ProgressTracker.jsx     # 진도율 시각화
│   │   ├── GradeReport.jsx         # 성적표
│   │   ├── ChildLocationCard.jsx   # 자녀 현재 위치 카드
│   │   └── CCTVViewer.jsx          # CCTV 영상 플레이어
│   │
│   ├── student/
│   │   └── InviteCodeManager.jsx   # 초대 코드 생성/관리
│   │
│   ├── metaverse/
│   │   ├── CCTVCamera.jsx          # 교실 내 CCTV 카메라 (3D)
│   │   ├── ViewerIndicator.jsx     # "👁️ 참관 중" UI 표시
│   │   └── ParentShareButton.jsx   # "부모님께 화면 공유" 버튼 (학생용)
│   │
│   └── instructor/
│       └── CCTVControl.jsx         # 강사용 CCTV 제어 패널
│
└── services/
    ├── inviteService.js            # 초대 코드 API
    ├── parentService.js            # 부모 데이터 API
    ├── attendanceService.js        # 출석 API
    └── cctvService.js              # CCTV API + WebRTC
```

### 주요 컴포넌트 명세

#### RegisterParent.jsx
```javascript
/**
 * 부모 회원가입 페이지
 * - URL: /register-parent?code=ABC12XYZ
 * - 초대 코드 검증 후 회원가입 폼 표시
 */
export default function RegisterParent() {
  const [searchParams] = useSearchParams()
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '')
  const [studentInfo, setStudentInfo] = useState(null)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })

  // 1. 초대 코드 검증
  useEffect(() => {
    if (inviteCode) validateCode()
  }, [inviteCode])

  // 2. 회원가입 처리
  const handleRegister = async (e) => {
    // POST /api/auth/register-parent
  }

  return (
    <div>
      {!studentInfo ? (
        <CodeInput /> // 코드 입력
      ) : (
        <RegistrationForm /> // 가입 폼
      )}
    </div>
  )
}
```

#### ParentDashboard.jsx
```javascript
/**
 * 부모 메인 대시보드
 * - 자녀 선택
 * - 통계 카드 (강의, 출석률, 과제, 평균 점수)
 * - 탭: 강의, 과제, 출석, 성적
 */
export default function ParentDashboard() {
  const [children, setChildren] = useState([])
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [activeTab, setActiveTab] = useState('courses')

  // 자녀 목록 로드
  useEffect(() => {
    loadChildren()
  }, [])

  // 선택된 자녀 대시보드 로드
  useEffect(() => {
    if (selectedChildId) loadDashboard(selectedChildId)
  }, [selectedChildId])

  return (
    <div>
      <ChildSelector
        children={children}
        selectedId={selectedChildId}
        onSelect={setSelectedChildId}
      />

      <StatsCards data={dashboardData?.stats} />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="courses" label="강의" />
        <Tab value="assignments" label="과제" />
        <Tab value="attendance" label="출석" />
        <Tab value="grades" label="성적" />
      </Tabs>

      {activeTab === 'courses' && <ChildCourseList studentId={selectedChildId} />}
      {activeTab === 'assignments' && <AssignmentList studentId={selectedChildId} />}
      {activeTab === 'attendance' && <AttendanceView studentId={selectedChildId} />}
      {activeTab === 'grades' && <GradeReport studentId={selectedChildId} />}
    </div>
  )
}
```

#### InviteCodeManager.jsx
```javascript
/**
 * 학생용 초대 코드 관리
 * - Profile 페이지에 삽입
 * - 코드 생성, 복사, 취소
 * - 연결된 부모 목록
 */
export default function InviteCodeManager() {
  const [invites, setInvites] = useState([])
  const [connectedParents, setConnectedParents] = useState([])

  const generateCode = async () => {
    // POST /api/invites/generate
  }

  const revokeCode = async (code) => {
    // DELETE /api/invites/:code
  }

  const disconnectParent = async (linkId) => {
    // DELETE /api/parents/children/:linkId (학생도 가능하도록 API 수정 필요)
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3>부모 계정 연결</h3>

      {/* 초대 코드 생성 */}
      <button onClick={generateCode}>초대 코드 생성</button>

      {/* 활성 초대 코드 */}
      {invites.map(invite => (
        <div key={invite.id}>
          <code>{invite.inviteCode}</code>
          <button onClick={() => navigator.clipboard.writeText(invite.inviteCode)}>
            복사
          </button>
          <button onClick={() => revokeCode(invite.inviteCode)}>취소</button>
          <span>만료: {formatDate(invite.expiresAt)}</span>
        </div>
      ))}

      {/* 연결된 부모 */}
      <h4>연결된 부모</h4>
      {connectedParents.map(parent => (
        <div key={parent.id}>
          {parent.name} ({parent.email})
          <button onClick={() => disconnectParent(parent.linkId)}>
            연결 해제
          </button>
        </div>
      ))}
    </div>
  )
}
```

#### ChildSelector.jsx
```javascript
/**
 * 자녀 선택 드롭다운
 */
export default function ChildSelector({ children, selectedId, onSelect }) {
  return (
    <select
      value={selectedId || ''}
      onChange={(e) => onSelect(e.target.value)}
      className="px-4 py-2 bg-gray-700 rounded-lg"
    >
      <option value="">자녀 선택</option>
      {children.map(child => (
        <option key={child.id} value={child.id}>
          {child.nickname || child.name}
          {child.stats && ` (강의 ${child.stats.activeCourses}개)`}
        </option>
      ))}
    </select>
  )
}
```

#### AttendanceView.jsx
```javascript
/**
 * 출석 캘린더 및 통계
 */
export default function AttendanceView({ studentId }) {
  const [attendance, setAttendance] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState(null)

  useEffect(() => {
    loadAttendance()
  }, [studentId, selectedCourse])

  return (
    <div>
      <CourseFilter value={selectedCourse} onChange={setSelectedCourse} />

      <AttendanceStats stats={stats} />

      <Calendar
        attendance={attendance}
        renderDay={(date) => {
          const record = attendance.find(a => a.sessionDate === date)
          return (
            <div className={getStatusColor(record?.status)}>
              {record?.status === 'present' && '✓'}
              {record?.status === 'absent' && '✗'}
              {record?.status === 'late' && '△'}
            </div>
          )
        }}
      />
    </div>
  )
}
```

#### ChildLocationCard.jsx
```javascript
/**
 * 자녀 현재 위치 + CCTV 시청 버튼
 */
export default function ChildLocationCard({ studentId, studentName }) {
  const [location, setLocation] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLocation = async () => {
      const data = await parentService.getChildLocation(studentId)
      setLocation(data)
      setIsLoading(false)
    }
    fetchLocation()

    // 30초마다 위치 갱신
    const interval = setInterval(fetchLocation, 30000)
    return () => clearInterval(interval)
  }, [studentId])

  if (isLoading) return <Skeleton />

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h4 className="text-lg font-semibold">{studentName}</h4>

      {location?.isOnline ? (
        <>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>온라인</span>
          </div>

          {location.isInClassroom ? (
            <div className="mt-3">
              <p className="text-gray-400">현재 위치:</p>
              <p className="text-xl">{location.classroom.name}</p>

              {location.classroom.cctvEnabled && (
                <Link
                  to={`/observe/${studentId}/${location.classroom.id}`}
                  className="mt-3 inline-flex items-center gap-2 bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  📹 수업 참관하기
                </Link>
              )}

              {!location.classroom.cctvEnabled && (
                <p className="mt-2 text-yellow-500 text-sm">
                  ⚠️ 강사가 CCTV를 비활성화했습니다
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-gray-400">교실 밖에 있습니다</p>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 bg-gray-500 rounded-full" />
          <span className="text-gray-400">오프라인</span>
        </div>
      )}
    </div>
  )
}
```

#### CCTVViewer.jsx
```javascript
/**
 * CCTV 영상 플레이어 (단일 카메라 + 학생 화면 지원)
 * - CCTV: 교실 후방 1대 카메라
 * - 학생 화면: 학생이 동의한 경우에만 시청 가능
 */
export default function CCTVViewer({ classroomId, studentId, studentName, onClose }) {
  const cctvVideoRef = useRef(null)
  const screenVideoRef = useRef(null)
  const cctvPeerConnection = useRef(null)
  const screenPeerConnection = useRef(null)

  const [activeTab, setActiveTab] = useState('cctv') // 'cctv' | 'screen'
  const [status, setStatus] = useState('connecting')
  const [errorMessage, setErrorMessage] = useState('')
  const [viewerCount, setViewerCount] = useState(0)

  // 학생 화면 공유 상태 (학생 동의 필요)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenStatus, setScreenStatus] = useState('idle') // idle, connecting, streaming
  const [hasStudentConsent, setHasStudentConsent] = useState(false) // 학생이 공유 버튼을 눌렀는지

  useEffect(() => {
    initCCTV()
    initScreenShare()
    return () => cleanup()
  }, [classroomId, studentId])

  // CCTV 초기화 (단일 카메라)
  const initCCTV = async () => {
    socketService.emit('cctv:request', { classroomId, studentId })

    socketService.on('cctv:authorized', () => {
      setStatus('authorized')
      setupCCTVConnection()
    })
    socketService.on('cctv:denied', ({ reason }) => {
      setStatus('denied')
      setErrorMessage(reason)
    })
    socketService.on('cctv:offer', handleCCTVOffer)
    socketService.on('cctv:stopped', ({ reason }) => {
      setStatus('stopped')
      setErrorMessage(reason)
    })
    socketService.on('cctv:viewer-joined', ({ viewerCount }) => setViewerCount(viewerCount))
  }

  // 학생 화면 공유 초기화 (학생 동의 필요)
  const initScreenShare = () => {
    // 학생이 "부모님께 화면 공유" 버튼을 눌렀을 때
    socketService.on('parent:screen-started', ({ hasConsent }) => {
      setIsScreenSharing(true)
      setHasStudentConsent(hasConsent)
    })
    socketService.on('parent:screen-stopped', () => {
      setIsScreenSharing(false)
      setScreenStatus('idle')
      setHasStudentConsent(false)
    })
    socketService.on('parent:screen-offer', handleScreenOffer)

    // 현재 화면 공유 상태 확인
    socketService.emit('parent:screen-request', { studentId })
    socketService.on('parent:screen-authorized', ({ isSharing, hasConsent }) => {
      setIsScreenSharing(isSharing)
      setHasStudentConsent(hasConsent)
      if (isSharing && hasConsent) {
        setScreenStatus('connecting')
        setupScreenConnection()
      }
    })
  }

  // WebRTC 연결 설정 (CCTV)
  const setupCCTVConnection = () => {
    cctvPeerConnection.current = new RTCPeerConnection(config)
    cctvPeerConnection.current.ontrack = (event) => {
      cctvVideoRef.current.srcObject = event.streams[0]
      setStatus('streaming')
    }
  }

  // WebRTC 연결 설정 (학생 화면)
  const setupScreenConnection = () => {
    screenPeerConnection.current = new RTCPeerConnection(config)
    screenPeerConnection.current.ontrack = (event) => {
      screenVideoRef.current.srcObject = event.streams[0]
      setScreenStatus('streaming')
    }
  }

  const handleCCTVOffer = async ({ offer }) => {
    await cctvPeerConnection.current.setRemoteDescription(offer)
    const answer = await cctvPeerConnection.current.createAnswer()
    await cctvPeerConnection.current.setLocalDescription(answer)
    socketService.emit('cctv:answer', { classroomId, answer })
  }

  const handleScreenOffer = async ({ offer }) => {
    if (!screenPeerConnection.current) setupScreenConnection()
    await screenPeerConnection.current.setRemoteDescription(offer)
    const answer = await screenPeerConnection.current.createAnswer()
    await screenPeerConnection.current.setLocalDescription(answer)
    socketService.emit('parent:screen-answer', { studentId, answer })
  }

  const cleanup = () => {
    socketService.emit('cctv:stop', { classroomId })
    socketService.emit('parent:screen-stop', { studentId })
    // ... off 이벤트들
    cctvPeerConnection.current?.close()
    screenPeerConnection.current?.close()
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg overflow-hidden max-w-5xl w-full">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold">📹 {studentName} 수업 참관</h3>
            <p className="text-sm text-gray-400">👁️ {viewerCount}명 시청 중</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        {/* 탭 전환 */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('cctv')}
            className={`flex-1 py-3 text-center ${
              activeTab === 'cctv'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📹 교실 CCTV
          </button>
          <button
            onClick={() => setActiveTab('screen')}
            className={`flex-1 py-3 text-center relative ${
              activeTab === 'screen'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            💻 자녀 화면
            {isScreenSharing && (
              <span className="absolute top-2 right-4 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* CCTV 탭 (단일 후방 카메라) */}
        {activeTab === 'cctv' && (
          <div className="aspect-video bg-black relative">
            {/* 카메라 위치 표시 */}
            <div className="absolute top-3 left-3 bg-black/60 px-3 py-1 rounded text-sm">
              📹 후방 카메라 (칠판 방향)
            </div>

            {status === 'streaming' ? (
              <video ref={cctvVideoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
            ) : status === 'connecting' ? (
              <div className="absolute inset-0 flex items-center justify-center">연결 중...</div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl mb-4">🚫</span>
                <p>{errorMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* 학생 화면 탭 (학생 동의 필요) */}
        {activeTab === 'screen' && (
          <div className="aspect-video bg-black relative">
            {!isScreenSharing || !hasStudentConsent ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <span className="text-6xl mb-4">💻</span>
                <p className="text-lg">자녀가 화면을 공유하고 있지 않습니다</p>
                <p className="text-sm mt-2 text-center px-4">
                  자녀가 "부모님께 화면 공유" 버튼을 누르면<br/>
                  배운 내용이나 만든 작품을 볼 수 있습니다
                </p>
              </div>
            ) : screenStatus === 'streaming' ? (
              <video ref={screenVideoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                화면 연결 중...
              </div>
            )}
          </div>
        )}

        {/* 안내 문구 */}
        <div className="p-4 bg-gray-800 text-sm text-gray-400">
          <p>※ 프라이버시 보호를 위해 음성은 제공되지 않습니다.</p>
          <p>※ 자녀가 교실을 떠나면 자동으로 시청이 종료됩니다.</p>
        </div>
      </div>
    </div>
  )
}
```

#### ViewerIndicator.jsx (메타버스 내 UI)
```javascript
/**
 * 학생 화면에 "부모님 참관 중" 표시
 * MetaverseScene에서 사용
 */
export default function ViewerIndicator({ viewerCount }) {
  if (viewerCount === 0) return null

  return (
    <div className="fixed top-4 right-4 bg-purple-600/80 px-3 py-2 rounded-lg flex items-center gap-2 z-50">
      <span className="animate-pulse">👁️</span>
      <span className="text-sm">{viewerCount}명 참관 중</span>
    </div>
  )
}
```

#### ParentShareButton.jsx (학생용 화면 공유 동의 버튼)
```javascript
/**
 * 학생이 부모에게 화면을 공유하기 위한 동의 버튼
 * 책상에 앉아 화면 공유 중일 때만 표시
 *
 * 용도: 자녀가 배운 내용, 만든 작품 등을 부모에게 자랑/공유
 */
export default function ParentShareButton({ isSharing, hasConnectedParent }) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [parentViewerCount, setParentViewerCount] = useState(0)

  useEffect(() => {
    socketService.on('parent:viewer-count', ({ count }) => {
      setParentViewerCount(count)
    })
    return () => socketService.off('parent:viewer-count')
  }, [])

  // 연결된 부모가 없으면 표시하지 않음
  if (!hasConnectedParent) return null

  // 화면 공유 중이 아니면 표시하지 않음
  if (!isSharing) return null

  const toggleParentShare = () => {
    if (isEnabled) {
      socketService.emit('parent:screen-consent', { enabled: false })
      setIsEnabled(false)
    } else {
      socketService.emit('parent:screen-consent', { enabled: true })
      setIsEnabled(true)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={toggleParentShare}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
          isEnabled
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }`}
      >
        <span>{isEnabled ? '👨‍👩‍👧' : '👨‍👩‍👧'}</span>
        <div className="text-left">
          <p className="text-sm">
            {isEnabled ? '부모님께 공유 중' : '부모님께 화면 공유'}
          </p>
          {isEnabled && parentViewerCount > 0 && (
            <p className="text-xs text-green-200">
              👁️ {parentViewerCount}명 시청 중
            </p>
          )}
        </div>
      </button>

      {/* 처음 공유할 때 안내 툴팁 */}
      {!isEnabled && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-800 p-2 rounded-lg text-xs text-gray-300 w-48">
          배운 내용이나 만든 작품을<br/>부모님께 보여주세요!
        </div>
      )}
    </div>
  )
}
```

#### CCTVControl.jsx (강사용)
```javascript
/**
 * 강사용 CCTV 제어 패널
 */
export default function CCTVControl({ classroomId }) {
  const [isEnabled, setIsEnabled] = useState(true)
  const [viewerCount, setViewerCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadCCTVStatus()

    socketService.on('cctv:viewer-joined', ({ viewerCount }) => setViewerCount(viewerCount))
    socketService.on('cctv:viewer-left', ({ viewerCount }) => setViewerCount(viewerCount))

    return () => {
      socketService.off('cctv:viewer-joined')
      socketService.off('cctv:viewer-left')
    }
  }, [classroomId])

  const toggleCCTV = async () => {
    setIsLoading(true)
    try {
      await cctvService.toggle(classroomId, !isEnabled)
      setIsEnabled(!isEnabled)
    } catch (error) {
      console.error('CCTV toggle failed:', error)
    }
    setIsLoading(false)
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold">📹 CCTV 참관</h4>
          <p className="text-sm text-gray-400">
            {isEnabled ? `👁️ ${viewerCount}명 시청 중` : '비활성화됨'}
          </p>
        </div>

        <button
          onClick={toggleCCTV}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg ${
            isEnabled
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isLoading ? '...' : isEnabled ? 'CCTV 끄기' : 'CCTV 켜기'}
        </button>
      </div>

      {isEnabled && viewerCount > 0 && (
        <p className="mt-2 text-yellow-500 text-sm">
          ⚠️ 현재 학부모님이 참관 중입니다
        </p>
      )}
    </div>
  )
}
```

### 서비스 계층

#### inviteService.js
```javascript
class InviteService {
  async generate() {
    return apiService.post('/invites/generate')
  }

  async validate(code) {
    return apiService.post('/invites/validate', { inviteCode: code })
  }

  async getMyInvites() {
    return apiService.get('/invites/my')
  }

  async revoke(code) {
    return apiService.delete(`/invites/${code}`)
  }
}

export const inviteService = new InviteService()
```

#### parentService.js
```javascript
class ParentService {
  async getChildren() {
    return apiService.get('/parents/children')
  }

  async getDashboard(studentId) {
    return apiService.get(`/parents/children/${studentId}/dashboard`)
  }

  async getCourses(studentId) {
    return apiService.get(`/parents/children/${studentId}/courses`)
  }

  async getAssignments(studentId, courseId = null) {
    const params = courseId ? `?courseId=${courseId}` : ''
    return apiService.get(`/parents/children/${studentId}/assignments${params}`)
  }

  async getProgress(studentId) {
    return apiService.get(`/parents/children/${studentId}/progress`)
  }

  async getAttendance(studentId, filters = {}) {
    const params = new URLSearchParams(filters).toString()
    return apiService.get(`/parents/children/${studentId}/attendance?${params}`)
  }

  async setNickname(studentId, nickname) {
    return apiService.post(`/parents/children/${studentId}/nickname`, { nickname })
  }

  async disconnect(linkId) {
    return apiService.delete(`/parents/children/${linkId}`)
  }
}

export const parentService = new ParentService()
```

#### cctvService.js
```javascript
import { socketService } from './socket'
import { apiService } from './api'

class CCTVService {
  // 자녀 위치 조회
  async getChildLocation(studentId) {
    return apiService.get(`/parents/children/${studentId}/location`)
  }

  // 교실 CCTV 상태 조회
  async getClassroomStatus(classroomId) {
    return apiService.get(`/cctv/classrooms/${classroomId}`)
  }

  // CCTV 활성화/비활성화 (강사용)
  async toggle(classroomId, enabled) {
    return apiService.post(`/cctv/classrooms/${classroomId}/toggle`, { enabled })
  }

  // CCTV 시청 시작
  startWatching(classroomId, studentId, callbacks) {
    socketService.emit('cctv:request', { classroomId, studentId })

    socketService.on('cctv:authorized', callbacks.onAuthorized)
    socketService.on('cctv:denied', callbacks.onDenied)
    socketService.on('cctv:offer', callbacks.onOffer)
    socketService.on('cctv:ice-candidate', callbacks.onIceCandidate)
    socketService.on('cctv:stopped', callbacks.onStopped)
    socketService.on('cctv:viewer-joined', callbacks.onViewerJoined)
    socketService.on('cctv:viewer-left', callbacks.onViewerLeft)
  }

  // CCTV 시청 종료
  stopWatching(classroomId) {
    socketService.emit('cctv:stop', { classroomId })

    socketService.off('cctv:authorized')
    socketService.off('cctv:denied')
    socketService.off('cctv:offer')
    socketService.off('cctv:ice-candidate')
    socketService.off('cctv:stopped')
    socketService.off('cctv:viewer-joined')
    socketService.off('cctv:viewer-left')
  }

  // WebRTC answer 전송
  sendAnswer(classroomId, answer) {
    socketService.emit('cctv:answer', { classroomId, answer })
  }

  // ICE candidate 전송
  sendIceCandidate(classroomId, candidate) {
    socketService.emit('cctv:ice-candidate', { classroomId, candidate })
  }
}

export const cctvService = new CCTVService()
```

---

## 구현 로드맵

### Phase 1: 핵심 인프라 (1-2주)

**Week 1: 데이터베이스 & 백엔드 기초**
- [ ] Day 1-2: 데이터베이스 마이그레이션 작성 및 적용
  - 012_parent_account_system.sql 작성
  - parent role 추가
  - parent_student_links 테이블
  - 초대 코드 생성 함수
  - RLS 정책 기본 설정
- [ ] Day 3-4: 초대 시스템 API 구현
  - server/routes/invites.js 생성
  - POST /generate, POST /validate, DELETE /:code
  - 테스트 (Postman/Thunder Client)
- [ ] Day 5: 부모 인증 API 구현
  - server/routes/auth.js 수정
  - POST /register-parent
  - server/middleware/auth.js에 requireParent 추가

**Week 2: 프론트엔드 기초**
- [ ] Day 1-2: 부모 회원가입 페이지
  - src/pages/RegisterParent.jsx 생성
  - 초대 코드 검증 UI
  - 회원가입 폼
  - App.jsx에 라우트 추가
- [ ] Day 3-4: 학생 초대 관리
  - src/components/student/InviteCodeManager.jsx
  - 코드 생성/복사/취소 UI
  - src/pages/Profile.jsx에 통합
- [ ] Day 5: 기본 부모 대시보드
  - src/components/dashboard/ParentDashboard.jsx
  - src/components/parent/ChildSelector.jsx
  - src/pages/Dashboard.jsx에 부모 role 분기

**마일스톤 1 완료**: 부모 가입 및 자녀 연결 가능

---

### Phase 2: 모니터링 기능 (2주)

**Week 3: 부모 데이터 접근 API**
- [ ] Day 1-2: 부모 API 기본 구조
  - server/routes/parents.js 생성
  - validateParentStudentLink 미들웨어
  - GET /children 구현
- [ ] Day 3: 자녀 대시보드 API
  - GET /children/:studentId/dashboard
  - 통계 집계 로직
- [ ] Day 4: 강의 조회 API
  - GET /children/:studentId/courses
  - RLS 정책 테스트
- [ ] Day 5: 과제 조회 API
  - GET /children/:studentId/assignments
  - enrollments + assignments 조인

**Week 4: 프론트엔드 모니터링**
- [ ] Day 1-2: 강의 모니터링
  - src/components/parent/ChildCourseList.jsx
  - 강의 카드 UI
  - 진행률 표시
- [ ] Day 3-4: 과제 모니터링
  - 과제 목록 컴포넌트
  - 제출 상태 뱃지
  - 성적 표시
- [ ] Day 5: 대시보드 통합
  - ParentDashboard에 탭 추가
  - 통계 카드
  - 테스트 및 버그 수정

**마일스톤 2 완료**: 부모가 자녀 학업 데이터 조회 가능

---

### Phase 3: 출석 및 진도율 (2-3주)

**Week 5: 출석 시스템 (데이터베이스 & 백엔드)**
- [ ] Day 1: 데이터베이스
  - attendance 테이블 추가
  - RLS 정책
  - get_attendance_rate() 함수
- [ ] Day 2-3: 출석 API
  - server/routes/attendance.js
  - POST /, POST /bulk
  - GET /course/:courseId, GET /student/:studentId
- [ ] Day 4-5: 강사용 출석 체크 UI (선택)
  - 간단한 출석 체크 인터페이스
  - 또는 수동 DB 입력

**Week 6: 진도율 추적 (데이터베이스 & 백엔드)**
- [ ] Day 1: 데이터베이스
  - course_progress 테이블 추가
  - 자동 생성 트리거
- [ ] Day 2-3: 진도율 API
  - GET /parents/children/:studentId/progress
  - GET /parents/children/:studentId/attendance
- [ ] Day 4-5: 진도율 업데이트 로직
  - 자료 완료 시 progress 업데이트 (선택)
  - 또는 수동 설정

**Week 7: 프론트엔드 완성**
- [ ] Day 1-2: 출석 뷰
  - src/components/parent/AttendanceView.jsx
  - 캘린더 UI
  - 출석 통계
- [ ] Day 3-4: 진도율 추적
  - src/components/parent/ProgressTracker.jsx
  - 진행률 바
  - 주차별 체크리스트
- [ ] Day 5: 성적표
  - src/components/parent/GradeReport.jsx
  - 강의별 성적
  - 평균 계산

**마일스톤 3 완료**: 전체 부모 모니터링 시스템 완성

---

### Phase 4: CCTV 실시간 참관 (2-3주)

**Week 8: CCTV 백엔드 & 메타버스 통합**
- [ ] Day 1: 데이터베이스
  - cctv_sessions 테이블 추가
  - cctv_view_logs 테이블 추가 (선택)
  - RLS 정책 설정
- [ ] Day 2-3: Socket.IO CCTV 이벤트 핸들러
  - server/sockets/cctv.js 생성
  - cctv:request, cctv:authorized, cctv:denied
  - cctv:toggle, cctv:stop
  - 시청자 수 관리 로직
- [ ] Day 4-5: 메타버스 CCTV 카메라
  - src/components/metaverse/CCTVCamera.jsx
  - 교실별 고정 카메라 위치 설정
  - WebRTC MediaStream 캡처

**Week 9: CCTV API & 부모 클라이언트**
- [ ] Day 1: REST API
  - GET /api/parents/children/:studentId/location
  - GET /api/cctv/classrooms/:classroomId
  - POST /api/cctv/classrooms/:classroomId/toggle
- [ ] Day 2-3: 부모 CCTV 뷰어
  - src/components/parent/ChildLocationCard.jsx
  - src/components/parent/CCTVViewer.jsx
  - WebRTC 연결 및 영상 재생
- [ ] Day 4-5: 서비스 레이어
  - src/services/cctvService.js
  - 테스트 및 디버깅

**Week 10: 강사 제어 & 학생 알림**
- [ ] Day 1-2: 강사 CCTV 제어
  - src/components/instructor/CCTVControl.jsx
  - MetaverseScene에 제어 UI 통합
- [ ] Day 3-4: 학생 참관 알림
  - src/components/metaverse/ViewerIndicator.jsx
  - Socket 이벤트로 실시간 시청자 수 동기화
- [ ] Day 5: 통합 테스트
  - 부모-학생-강사 시나리오 테스트
  - 권한 검증 테스트
  - 성능 테스트 (다중 시청자)

**마일스톤 4 완료**: CCTV 실시간 참관 시스템 완성

---

## 보안 설계

### 인증 & 권한 체계

#### 1. 데이터베이스 레벨 (RLS)
```
계층 1: Row Level Security
- 모든 테이블에 RLS 활성화
- auth.uid() 기반 필터링
- parent_student_links 존재 여부로 접근 제어
```

#### 2. API 레벨 (미들웨어)
```
계층 2: Express Middleware
- authMiddleware: JWT 검증
- requireParent: role='parent' 확인
- validateParentStudentLink: active link 검증
```

#### 3. 애플리케이션 레벨 (프론트엔드)
```
계층 3: React Route Guards
- PrivateRoute: 인증 필요
- ParentRoute: 부모 role 필요 (신규)
- 미인증 시 로그인 페이지로 리다이렉트
```

### 초대 코드 보안

**생성 규칙**:
- 8자리 영숫자 (대문자 + 숫자)
- 혼동 문자 제외: 0, O, I, 1
- 자동 중복 검사
- 예: ABC23XYZ

**만료 정책**:
- 생성 시점부터 7일 후 자동 만료
- code_expires_at < NOW() 체크
- 만료된 코드는 검증 실패

**일회용**:
- 부모 가입 완료 시 status='active'로 변경
- active 상태 코드는 재사용 불가
- 학생은 언제든 새 코드 생성 가능

**취소 기능**:
- 학생이 pending 상태 코드 취소 가능
- status='revoked'로 변경
- 해당 코드 영구 사용 불가

### 데이터 접근 제어

#### 부모가 조회 가능한 데이터
✅ **허용**:
- 자녀의 수강 강의 목록 (enrollments)
- 자녀의 과제 제출 및 성적 (assignment_submissions)
- 자녀의 출석 기록 (attendance)
- 자녀의 진도율 (course_progress)
- 강의 기본 정보 (courses, instructors)

❌ **거부**:
- 자녀의 개인 메시지 (미구현 시 해당 없음)
- 자녀의 채팅 내역 (미구현 시 해당 없음)
- 다른 학생의 데이터
- 강사 전용 데이터

#### RLS 정책 예시
```sql
-- 부모는 active link가 있는 자녀의 enrollments만 조회
CREATE POLICY "Parents can view their children's enrollments"
ON public.enrollments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_id = auth.uid()
      AND student_id = enrollments.student_id
      AND status = 'active'
  )
);
```

### 프라이버시 보호

#### 학생 권한
- **연결 제어**: 학생이 초대 코드 생성 권한 보유
- **해제 권한**: 학생이 언제든 부모 연결 해제 가능
- **투명성**: 연결된 부모 목록 확인 가능

#### 부모 권한
- **제한된 접근**: 학업 데이터만 조회 (개인 통신 제외)
- **닉네임 설정**: 부모만 볼 수 있는 자녀 별명
- **다중 연결**: 여러 자녀 동시 관리 가능

#### 다중 부모 지원
- 한 학생에 여러 부모 연결 가능 (예: 이혼 가정)
- 각 부모는 독립적으로 데이터 조회
- 부모 간 정보 공유 없음

### CCTV 프라이버시 보호

#### 접근 제어
- **부모 권한 검증**: 자녀가 해당 교실에 있을 때만 시청 가능
- **강사 제어권**: 강사가 언제든 CCTV 비활성화 가능 (개인 상담 등)
- **음성 차단**: 프라이버시 보호를 위해 영상만 제공

#### 시청 조건
```javascript
// 서버에서 CCTV 시청 승인 조건
const canWatchCCTV = async (parentId, studentId, classroomId) => {
  // 1. 부모-자녀 연결 확인
  const link = await checkParentStudentLink(parentId, studentId)
  if (!link || link.status !== 'active') return { allowed: false, reason: '연결되지 않은 자녀입니다' }

  // 2. 자녀가 해당 교실에 있는지 확인
  const studentLocation = await getStudentLocation(studentId)
  if (studentLocation.classroomId !== classroomId) {
    return { allowed: false, reason: '자녀가 해당 교실에 없습니다' }
  }

  // 3. CCTV 활성화 상태 확인
  const cctvSession = await getCCTVSession(classroomId)
  if (!cctvSession?.isEnabled) {
    return { allowed: false, reason: '강사가 CCTV를 비활성화했습니다' }
  }

  return { allowed: true }
}
```

#### 학생 알림
- 부모가 시청 중일 때 학생 화면에 `👁️ N명 참관 중` 표시
- 선택적: 시청 시작 시 알림 ("부모님이 참관을 시작했습니다")

#### 자동 종료 조건
1. 자녀가 교실을 떠날 때
2. 강사가 CCTV를 비활성화할 때
3. 수업이 종료될 때
4. 부모가 연결을 끊을 때

### 감사 로깅 (선택적)

**로그 대상**:
- 부모 가입 (초대 코드 사용)
- 부모 데이터 조회 (자녀 정보 접근)
- 연결 해제 (학생 또는 부모)
- **CCTV 시청 시작/종료** (시청 시간 기록)

**로그 테이블** (선택):
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 테스트 계획

### 단위 테스트

#### 백엔드 (Jest)
```javascript
// tests/unit/inviteService.test.js
describe('InviteService', () => {
  test('generate() should create unique 8-char code', async () => {
    const code = await generateInviteCode()
    expect(code).toHaveLength(8)
    expect(code).toMatch(/^[A-Z2-9]{8}$/)
  })

  test('validate() should reject expired code', async () => {
    const expiredCode = await createExpiredCode()
    const result = await inviteService.validate(expiredCode)
    expect(result.valid).toBe(false)
  })
})

// tests/unit/parentService.test.js
describe('ParentService', () => {
  test('getChildren() should return only linked students', async () => {
    const parent = await createTestParent()
    const children = await parentService.getChildren(parent.id)
    expect(children).toHaveLength(1)
    expect(children[0].id).toBe(testStudent.id)
  })
})
```

#### 프론트엔드 (Vitest + React Testing Library)
```javascript
// src/components/__tests__/ChildSelector.test.jsx
describe('ChildSelector', () => {
  test('renders all children in dropdown', () => {
    const children = [
      { id: '1', name: '홍길동', nickname: '첫째' },
      { id: '2', name: '김철수', nickname: null }
    ]

    render(<ChildSelector children={children} />)
    expect(screen.getByText('첫째')).toBeInTheDocument()
    expect(screen.getByText('김철수')).toBeInTheDocument()
  })
})
```

### 통합 테스트

#### API 통합 테스트
```javascript
// tests/integration/parent-registration.test.js
describe('Parent Registration Flow', () => {
  test('complete registration flow', async () => {
    // 1. 학생이 초대 코드 생성
    const student = await createTestStudent()
    const { inviteCode } = await request(app)
      .post('/api/invites/generate')
      .set('Authorization', `Bearer ${student.token}`)

    // 2. 초대 코드 검증
    const validation = await request(app)
      .post('/api/invites/validate')
      .send({ inviteCode })
    expect(validation.body.valid).toBe(true)

    // 3. 부모 회원가입
    const registration = await request(app)
      .post('/api/auth/register-parent')
      .send({
        inviteCode,
        name: '부모이름',
        email: 'parent@test.com',
        password: 'password123'
      })
    expect(registration.status).toBe(201)
    expect(registration.body.user.role).toBe('parent')

    // 4. 부모가 자녀 목록 조회
    const children = await request(app)
      .get('/api/parents/children')
      .set('Authorization', `Bearer ${registration.body.token}`)
    expect(children.body.children).toHaveLength(1)
  })
})
```

### E2E 테스트 (Playwright)

```javascript
// tests/e2e/parent-dashboard.spec.js
test('parent can view child grades', async ({ page }) => {
  // 1. 부모 로그인
  await page.goto('/login')
  await page.fill('input[name="email"]', 'parent@test.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // 2. 대시보드 이동
  await expect(page).toHaveURL('/dashboard')

  // 3. 자녀 선택
  await page.selectOption('select', { label: '홍길동' })

  // 4. 성적 탭 클릭
  await page.click('button:has-text("성적")')

  // 5. 과제 점수 확인
  await expect(page.locator('text=95점')).toBeVisible()
})
```

### 보안 테스트

#### 권한 테스트
```javascript
describe('Authorization Tests', () => {
  test('parent cannot access other student data', async () => {
    const parent = await createTestParent()
    const otherStudent = await createTestStudent()

    const response = await request(app)
      .get(`/api/parents/children/${otherStudent.id}/courses`)
      .set('Authorization', `Bearer ${parent.token}`)

    expect(response.status).toBe(403)
  })

  test('expired invite code should be rejected', async () => {
    const expiredCode = await createExpiredInviteCode()

    const response = await request(app)
      .post('/api/auth/register-parent')
      .send({
        inviteCode: expiredCode,
        name: '부모',
        email: 'parent@test.com',
        password: 'pass'
      })

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('만료')
  })
})
```

### 성능 테스트

#### 로드 테스트 (k6)
```javascript
// tests/performance/parent-dashboard.js
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  vus: 100, // 동시 사용자 100명
  duration: '30s'
}

export default function() {
  const token = 'parent_jwt_token'

  const res = http.get(
    'http://localhost:3000/api/parents/children/uuid/dashboard',
    { headers: { Authorization: `Bearer ${token}` } }
  )

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  })
}
```

### 테스트 데이터

#### 시드 데이터
```sql
-- tests/seeds/parent-account.sql

-- 테스트 학생
INSERT INTO profiles (id, email, name, role) VALUES
('student-1', 'student1@test.com', '홍길동', 'student'),
('student-2', 'student2@test.com', '김철수', 'student');

-- 테스트 부모
INSERT INTO profiles (id, email, name, role) VALUES
('parent-1', 'parent1@test.com', '부모1', 'parent');

-- 초대 링크
INSERT INTO parent_student_links (
  parent_id, student_id, invite_code, status,
  code_expires_at, accepted_at
) VALUES
('parent-1', 'student-1', 'TEST1234', 'active',
 NOW() + INTERVAL '7 days', NOW());

-- 테스트 강의 및 수강
INSERT INTO enrollments (student_id, course_id, status) VALUES
('student-1', 'course-1', 'active');

-- 테스트 출석
INSERT INTO attendance (student_id, course_id, session_date, status) VALUES
('student-1', 'course-1', '2025-12-20', 'present'),
('student-1', 'course-1', '2025-12-21', 'present'),
('student-1', 'course-1', '2025-12-22', 'absent');
```

---

## 부록

### API 응답 코드

| 코드 | 의미 | 예시 |
|-----|------|------|
| 200 | 성공 | 데이터 조회 성공 |
| 201 | 생성 성공 | 부모 계정 생성 |
| 400 | 잘못된 요청 | 만료된 초대 코드 |
| 401 | 인증 필요 | JWT 없음 |
| 403 | 권한 없음 | 다른 학생 데이터 접근 |
| 404 | 없음 | 존재하지 않는 학생 |
| 409 | 충돌 | 이미 사용된 초대 코드 |
| 500 | 서버 오류 | DB 연결 실패 |

### 에러 메시지 예시

```json
{
  "error": "초대 코드가 만료되었습니다.",
  "code": "INVITE_CODE_EXPIRED",
  "details": {
    "expiresAt": "2025-12-20T23:59:59Z"
  }
}
```

### 마이그레이션 파일명

```
supabase/migrations/
├── 012_parent_account_system_part1.sql  # parent role + parent_student_links
├── 013_parent_account_system_part2.sql  # attendance
└── 014_parent_account_system_part3.sql  # course_progress
```

### 참고 문서

- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [React Router v7 문서](https://reactrouter.com/en/main)
- [TanStack Query 가이드](https://tanstack.com/query/latest)

---

**작성일**: 2025-12-24
**버전**: 1.3
**작성자**: Claude Code (AI Assistant)

### 변경 이력

| 버전 | 날짜 | 변경 내용 |
|-----|------|----------|
| 1.0 | 2025-12-24 | 초기 버전 (부모 계정, 초대 코드, 학업 모니터링) |
| 1.1 | 2025-12-24 | CCTV 실시간 참관 기능 추가 (FR-6, NFR-4, Phase 4) |
| 1.2 | 2025-12-24 | 다중 카메라(4대) 지원 + 학생 화면 공유 참관 기능 추가 (FR-7) |
| 1.3 | 2025-12-24 | CCTV 단일 카메라(후방 1대)로 단순화, 학생 화면 공유 동의 필수화 (옵트인) |
