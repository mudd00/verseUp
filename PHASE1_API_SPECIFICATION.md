# VerseUp 1차 프로젝트 API 명세서

> 2차 프로젝트 Spring Boot 백엔드 개발을 위한 API 상세 명세

## 목차
1. [인증 (Auth)](#1-인증-auth)
2. [강의 (Courses)](#2-강의-courses)
3. [강의실 (Classrooms)](#3-강의실-classrooms)
4. [결제 (Payments)](#4-결제-payments)
5. [출석 (Attendance)](#5-출석-attendance)
6. [과제 (Assignments)](#6-과제-assignments)
7. [학습 자료 (Materials)](#7-학습-자료-materials)
8. [진도율 (Progress)](#8-진도율-progress)
9. [알림 (Notifications)](#9-알림-notifications)
10. [부모-학생 연결 (Invites)](#10-부모-학생-연결-invites)
11. [부모 대시보드 (Parents)](#11-부모-대시보드-parents)
12. [관리자 (Admin)](#12-관리자-admin)

---

## 공통 사항

### Base URL
- 개발: `http://localhost:3000/api`
- 프로덕션: `/api`

### 인증 헤더
```
Authorization: Bearer <JWT_TOKEN>
```

### 공통 에러 응답
```json
{
  "error": "에러 메시지"
}
```

### HTTP 상태 코드
| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 에러 |
| 503 | 서비스 불가 (DB 연결 실패) |

---

## 1. 인증 (Auth)

### GET /api/auth/me
현재 로그인한 사용자 정보 조회

**인증**: 필수

**Response (200)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "role": "student|instructor|admin|parent",
    "avatarUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### POST /api/auth/register-parent
부모 계정 등록 (초대 코드 사용)

**인증**: 불필요

**Request Body**:
```json
{
  "inviteCode": "ABC123",
  "name": "부모님 이름",
  "email": "parent@example.com",
  "password": "password123"
}
```

**Response (201)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "parent@example.com",
    "name": "부모님 이름",
    "role": "parent"
  },
  "token": "jwt_token",
  "student": {
    "id": "student_uuid",
    "name": "자녀 이름"
  }
}
```

**에러 응답**:
- 400: 이미 사용된/만료된/잘못된 코드
- 400: 이미 등록된 이메일

---

### DELETE /api/auth/account
계정 삭제

**인증**: 필수

**Response (200)**:
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## 2. 강의 (Courses)

### GET /api/courses
강의 목록 조회 (공개)

**인증**: 불필요

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| search | string | 제목/설명 검색 |
| category | string | 카테고리 필터 |
| level | string | 난이도 필터 (beginner/intermediate/advanced) |
| minPrice | number | 최소 가격 |
| maxPrice | number | 최대 가격 |
| instructorId | string | 강사 ID 필터 |

**Response (200)**:
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "강의 제목",
      "description": "설명",
      "instructor": {
        "id": "uuid",
        "name": "강사명",
        "email": "instructor@example.com"
      },
      "classroom": {
        "id": "uuid",
        "name": "강의실 A",
        "capacity": 20
      },
      "time_slot": {
        "id": "uuid",
        "day_of_week": 1,
        "start_time": "09:00:00",
        "end_time": "10:30:00"
      },
      "price": 50000,
      "max_students": 20,
      "enrolled_count": 15,
      "weeks": 8,
      "start_date": "2024-03-01",
      "end_date": "2024-04-26",
      "status": "published",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET /api/courses/:id
강의 상세 조회

**Response (200)**:
```json
{
  "course": {
    "id": "uuid",
    "title": "강의 제목",
    "description": "설명",
    "instructor": { ... },
    "classroom": { ... },
    "time_slot": { ... },
    "schedules": [
      {
        "id": "uuid",
        "week_number": 1,
        "session_date": "2024-03-01",
        "start_time": "09:00:00",
        "end_time": "10:30:00",
        "status": "scheduled"
      }
    ],
    "price": 50000,
    "max_students": 20,
    "enrolled_count": 15,
    "weeks": 8
  }
}
```

---

### POST /api/courses
강의 생성

**인증**: 필수 (instructor/admin)

**Request Body**:
```json
{
  "title": "강의 제목",
  "description": "강의 설명",
  "classroomId": "uuid",
  "timeSlotId": "uuid",
  "weeks": 8,
  "maxStudents": 20,
  "startDate": "2024-03-01",
  "thumbnail": "https://...",
  "price": 50000
}
```

**Response (201)**:
```json
{
  "course": { ... }
}
```

**에러 응답**:
- 409: 시간대 충돌 (해당 시간에 이미 다른 강의 존재)

---

### PUT /api/courses/:id
강의 수정

**인증**: 필수 (강의 담당 강사 또는 admin)

**Request Body** (모든 필드 선택):
```json
{
  "title": "수정된 제목",
  "description": "수정된 설명",
  "maxStudents": 25,
  "thumbnail": "https://...",
  "price": 60000,
  "status": "published|draft|cancelled"
}
```

---

### DELETE /api/courses/:id
강의 삭제

**인증**: 필수 (강의 담당 강사 또는 admin)

**Response (200)**:
```json
{
  "message": "Course deleted successfully"
}
```

---

### POST /api/courses/:id/enroll
수강 신청 (무료 강의만)

**인증**: 필수

**Response (200)**:
```json
{
  "message": "수강 신청이 완료되었습니다.",
  "enrollment": {
    "id": "uuid",
    "course_id": "uuid",
    "student_id": "uuid",
    "status": "active",
    "enrolled_at": "2024-01-01T00:00:00Z"
  },
  "courseId": "uuid"
}
```

**에러 응답**:
- 400: 정원 초과
- 400: 이미 수강 중
- 400: 유료 강의 (결제 필요)

---

### POST /api/courses/:id/drop
수강 취소

**인증**: 필수

**Response (200)**:
```json
{
  "message": "수강 취소가 완료되었습니다.",
  "enrollment": { ... },
  "courseId": "uuid"
}
```

---

### GET /api/courses/:id/enrollment-status
수강 상태 확인

**인증**: 필수

**Response (200)**:
```json
{
  "isEnrolled": true,
  "enrollmentId": "uuid",
  "enrolledAt": "2024-01-01T00:00:00Z"
}
```

---

### GET /api/courses/:id/check-access
강의실 접근 권한 확인

**인증**: 필수

**Response (200)**:
```json
{
  "hasAccess": true,
  "accessReason": "enrolled|instructor|admin",
  "course": { ... },
  "currentSchedule": { ... }
}
```

---

### GET /api/courses/my
내 강의 목록 (강사용)

**인증**: 필수 (instructor/admin)

**Response (200)**:
```json
{
  "courses": [ ... ]
}
```

---

### GET /api/courses/enrollments/my
내 수강 목록 (학생용)

**인증**: 필수

**Response (200)**:
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "status": "active",
      "enrolled_at": "2024-01-01T00:00:00Z",
      "course": { ... }
    }
  ]
}
```

---

### GET /api/courses/instructors
강사 목록 조회

**Response (200)**:
```json
{
  "instructors": [
    {
      "id": "uuid",
      "name": "강사명"
    }
  ]
}
```

---

### GET /api/courses/instructors/stats
강사 통계 (강사용)

**인증**: 필수 (instructor/admin)

**Response (200)**:
```json
{
  "totalCourses": 5,
  "totalStudents": 120,
  "activeCourses": 3
}
```

---

## 3. 강의실 (Classrooms)

### GET /api/classrooms
강의실 목록 조회

**Response (200)**:
```json
{
  "classrooms": [
    {
      "id": "uuid",
      "name": "강의실 A",
      "description": "설명",
      "capacity": 30,
      "status": "active"
    }
  ]
}
```

---

### GET /api/classrooms/:id
강의실 상세 조회 (시간표 포함)

**Response (200)**:
```json
{
  "classroom": {
    "id": "uuid",
    "name": "강의실 A",
    "description": "설명",
    "capacity": 30,
    "timeSlots": [
      {
        "id": "uuid",
        "day_of_week": 1,
        "start_time": "09:00:00",
        "end_time": "10:30:00",
        "slot_order": 1,
        "is_active": true
      }
    ]
  }
}
```

---

### POST /api/classrooms/:id/available-slots
시간대 가용성 확인

**Request Body**:
```json
{
  "startDate": "2024-03-01",
  "weeks": 8
}
```

**Response (200)**:
```json
{
  "timeSlots": [
    {
      "id": "uuid",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "10:30:00",
      "isAvailable": true,
      "conflictingCourse": null
    },
    {
      "id": "uuid",
      "day_of_week": 1,
      "start_time": "11:00:00",
      "end_time": "12:30:00",
      "isAvailable": false,
      "conflictingCourse": {
        "id": "uuid",
        "title": "충돌 강의명",
        "date": "2024-03-01"
      }
    }
  ]
}
```

---

### GET /api/classrooms/:id/check-access
강의실 접근 권한 확인 (시간 기반)

**인증**: 필수

**Response (200)**:
```json
{
  "hasAccess": true,
  "accessReason": "enrolled|instructor|admin|parent_observer",
  "classroom": { ... },
  "course": { ... },
  "currentSchedule": { ... }
}
```

**접근 불가 시**:
```json
{
  "hasAccess": false,
  "reason": "no_session|not_enrolled|child_not_enrolled",
  "message": "현재 시간에 진행 중인 강의가 없습니다."
}
```

---

### POST /api/classrooms
강의실 생성 (admin)

**인증**: 필수 (admin)

**Request Body**:
```json
{
  "name": "강의실 C",
  "description": "설명",
  "capacity": 30
}
```

---

### PUT /api/classrooms/:id
강의실 수정 (admin)

**인증**: 필수 (admin)

---

## 4. 결제 (Payments)

### POST /api/payments/confirm
결제 승인 및 수강 신청 처리

**인증**: 필수

**Request Body**:
```json
{
  "orderId": "ORDER_courseId_timestamp",
  "paymentKey": "toss_payment_key",
  "amount": 50000
}
```

**Response (200)**:
```json
{
  "success": true,
  "orderId": "ORDER_...",
  "orderName": "강의명",
  "amount": 50000,
  "method": "카드",
  "approvedAt": "2024-01-01T00:00:00Z",
  "receipt": "https://...",
  "courseId": "uuid",
  "enrolled": true,
  "enrollmentId": "uuid"
}
```

**수강 신청 실패 시 자동 환불**:
```json
{
  "error": "수강 신청 처리에 실패하여 결제가 자동으로 환불되었습니다.",
  "refunded": true
}
```

---

### GET /api/payments
내 결제 내역 목록

**인증**: 필수

**Response (200)**:
```json
{
  "payments": [
    {
      "orderId": "ORDER_...",
      "paymentKey": "...",
      "amount": 50000,
      "status": "completed",
      "method": "카드",
      "orderName": "강의명",
      "approvedAt": "2024-01-01T00:00:00Z",
      "receipt": "https://..."
    }
  ]
}
```

---

### GET /api/payments/:orderId
결제 상세 조회

**인증**: 필수

---

### POST /api/payments/refund
환불 요청

**인증**: 필수

**Request Body**:
```json
{
  "enrollmentId": "uuid"
}
```

**환불 정책**:
- 강의 시작 7일 전: 100% 환불
- 강의 시작 7일 이내: 70% 환불
- 강의 시작 후: 환불 불가

**Response (200)**:
```json
{
  "success": true,
  "message": "환불이 성공적으로 완료되었습니다.",
  "refund": {
    "refundId": "uuid",
    "originalAmount": 50000,
    "refundAmount": 35000,
    "refundRate": 70,
    "policy": "강의 시작 7일 이내 - 70% 환불",
    "completedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### GET /api/payments/refunds
환불 내역 조회

**인증**: 필수

---

## 5. 출석 (Attendance)

### GET /api/attendance/course/:courseId
강의 출석 기록 조회 (강사)

**인증**: 필수 (instructor/admin)

---

### GET /api/attendance/course/:courseId/session/:date
특정 날짜 출석 현황

**인증**: 필수 (instructor/admin)

**Response (200)**:
```json
{
  "course": { "id": "uuid", "title": "강의명" },
  "date": "2024-03-01",
  "students": [
    {
      "student": {
        "id": "uuid",
        "name": "학생명",
        "email": "student@example.com"
      },
      "attendance": {
        "id": "uuid",
        "status": "present|absent|late|excused",
        "notes": "메모",
        "check_in_time": "09:05:00"
      }
    }
  ]
}
```

---

### GET /api/attendance/course/:courseId/students
강의 수강생 목록 (출석용)

**인증**: 필수 (instructor/admin)

---

### POST /api/attendance
출석 기록 생성/수정

**인증**: 필수 (instructor/admin)

**Request Body**:
```json
{
  "studentId": "uuid",
  "courseId": "uuid",
  "sessionDate": "2024-03-01",
  "weekNumber": 1,
  "status": "present|absent|late|excused",
  "notes": "메모"
}
```

---

### POST /api/attendance/bulk
일괄 출석 처리

**인증**: 필수 (instructor/admin)

**Request Body**:
```json
{
  "courseId": "uuid",
  "sessionDate": "2024-03-01",
  "weekNumber": 1,
  "records": [
    { "studentId": "uuid", "status": "present" },
    { "studentId": "uuid", "status": "absent", "notes": "병결" }
  ]
}
```

---

### PUT /api/attendance/:id
출석 기록 수정

---

### DELETE /api/attendance/:id
출석 기록 삭제

---

### GET /api/attendance/course/:courseId/stats
출석 통계

**Response (200)**:
```json
{
  "course": { "id": "uuid", "title": "강의명" },
  "stats": {
    "totalSessions": 8,
    "totalRecords": 160,
    "studentCount": 20,
    "present": 140,
    "absent": 10,
    "late": 8,
    "excused": 2,
    "attendanceRate": 93
  },
  "sessions": ["2024-03-08", "2024-03-01"]
}
```

---

## 6. 과제 (Assignments)

### GET /api/courses/:courseId/assignments
강의 과제 목록

**인증**: 필수 (수강생/강사/admin)

---

### GET /api/assignments/:id
과제 상세

**인증**: 필수

---

### POST /api/courses/:courseId/assignments
과제 생성

**인증**: 필수 (instructor/admin)

**Request Body**:
```json
{
  "title": "과제 제목",
  "description": "설명",
  "instructions": "제출 방법 안내",
  "max_score": 100,
  "due_date": "2024-03-15T23:59:59Z",
  "allow_late_submission": true,
  "late_penalty_percent": 10,
  "week_number": 3
}
```

---

### PUT /api/assignments/:id
과제 수정

---

### DELETE /api/assignments/:id
과제 삭제

---

### POST /api/assignments/:id/upload
과제 파일 업로드

**인증**: 필수 (학생)

**Request**: `multipart/form-data`
- file: 업로드할 파일 (최대 20MB)

**Response (200)**:
```json
{
  "file_url": "https://...",
  "file_name": "과제.pdf",
  "file_size": 1024000,
  "file_type": "application/pdf"
}
```

---

### POST /api/assignments/:id/submit
과제 제출

**인증**: 필수 (학생)

**Request Body**:
```json
{
  "content": "텍스트 내용",
  "file_url": "https://...",
  "file_name": "과제.pdf",
  "file_size": 1024000,
  "file_type": "application/pdf"
}
```

---

### GET /api/assignments/:id/submissions
과제 제출 목록 (강사)

**인증**: 필수 (instructor/admin)

---

### PUT /api/submissions/:id/grade
과제 채점

**인증**: 필수 (instructor/admin)

**Request Body**:
```json
{
  "score": 85,
  "feedback": "잘했습니다!"
}
```

---

## 7. 학습 자료 (Materials)

### GET /api/courses/:courseId/materials
강의 자료 목록

**인증**: 필수 (수강생/강사/admin)

---

### POST /api/courses/:courseId/materials/upload
자료 업로드

**인증**: 필수 (instructor/admin)

**Request**: `multipart/form-data`
- file: 파일 (최대 50MB)
- title: 자료 제목
- description: 설명 (선택)
- week_number: 주차 (선택)

---

### GET /api/courses/:courseId/materials/:materialId/download
자료 다운로드 (서버 프록시)

**인증**: 필수 (수강생/강사/admin)

**Response**: 파일 다운로드 (Content-Disposition: attachment)

---

### DELETE /api/courses/:courseId/materials/:materialId
자료 삭제

**인증**: 필수 (instructor/admin)

---

## 8. 진도율 (Progress)

### GET /api/progress/course/:courseId
강의 진도율 목록 (강사)

**인증**: 필수 (instructor/admin)

---

### GET /api/progress/student/:studentId
학생 진도율 조회

**인증**: 필수 (본인/instructor/admin)

---

### PUT /api/progress/:id
진도율 수정

**인증**: 필수 (instructor/admin)

**Request Body**:
```json
{
  "currentWeek": 3,
  "completedWeeks": [1, 2, 3],
  "completionPercentage": 37.5,
  "totalStudyHours": 12
}
```

---

### POST /api/progress/:id/complete-week
주차 완료 처리

**Request Body**:
```json
{
  "weekNumber": 3
}
```

---

### POST /api/progress/:id/uncomplete-week
주차 완료 취소

---

### POST /api/progress/course/:courseId/bulk-complete-week
일괄 주차 완료 처리

---

## 9. 알림 (Notifications)

### GET /api/notifications
알림 목록 조회

**인증**: 필수

**Query Parameters**:
| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| limit | number | 20 | 개수 |
| offset | number | 0 | 시작점 |
| unreadOnly | boolean | false | 읽지 않은 것만 |

**Response (200)**:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "assignment_created|assignment_graded|...",
      "title": "알림 제목",
      "message": "알림 내용",
      "data": { ... },
      "is_read": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/notifications/unread-count
읽지 않은 알림 개수

---

### PUT /api/notifications/:id/read
알림 읽음 처리

---

### PUT /api/notifications/read-all
모든 알림 읽음 처리

---

### DELETE /api/notifications/:id
알림 삭제

---

## 10. 부모-학생 연결 (Invites)

### POST /api/invites/generate
초대 코드 생성 (학생)

**인증**: 필수 (student)

**Response (201)**:
```json
{
  "inviteCode": "ABC123",
  "expiresAt": "2024-01-08T00:00:00Z",
  "studentId": "uuid"
}
```

---

### POST /api/invites/validate
초대 코드 검증 (공개)

**Request Body**:
```json
{
  "inviteCode": "ABC123"
}
```

**Response (200)**:
```json
{
  "valid": true,
  "student": {
    "id": "uuid",
    "name": "학생명",
    "email": "student@example.com"
  },
  "expiresAt": "2024-01-08T00:00:00Z"
}
```

---

### GET /api/invites/my
내 초대 코드 목록 (학생)

---

### DELETE /api/invites/:code
초대 코드 취소 (학생)

---

### GET /api/invites/connected-parents
연결된 부모 목록 (학생)

---

### DELETE /api/invites/disconnect/:linkId
부모 연결 해제 (학생)

---

## 11. 부모 대시보드 (Parents)

### GET /api/parents/children
연결된 자녀 목록

**인증**: 필수 (parent)

**Response (200)**:
```json
{
  "children": [
    {
      "id": "uuid",
      "name": "자녀명",
      "email": "child@example.com",
      "avatarUrl": "https://...",
      "nickname": "우리 딸",
      "linkedAt": "2024-01-01T00:00:00Z",
      "stats": {
        "activeCourses": 3,
        "pendingAssignments": 2,
        "averageGrade": 85.5,
        "attendanceRate": 93.2
      }
    }
  ]
}
```

---

### POST /api/parents/children/:studentId/nickname
자녀 별명 설정

**Request Body**:
```json
{
  "nickname": "우리 아들"
}
```

---

### DELETE /api/parents/children/:linkId
자녀 연결 해제

---

### GET /api/parents/children/:studentId/dashboard
자녀 대시보드

---

### GET /api/parents/children/:studentId/courses
자녀 수강 목록

---

### GET /api/parents/children/:studentId/assignments
자녀 과제 현황

**Query**: `?courseId=uuid` (선택)

---

### GET /api/parents/children/:studentId/attendance
자녀 출석 현황

**Query**: `?courseId=uuid&startDate=2024-01-01&endDate=2024-03-31`

---

### GET /api/parents/children/:studentId/progress
자녀 학습 진도

---

### GET /api/parents/children/:studentId/location
자녀 메타버스 위치 (실시간)

---

## 12. 관리자 (Admin)

### GET /api/admin/users
사용자 목록

**인증**: 필수 (admin)

**Query**: `?page=1&limit=20&search=검색어&role=student`

---

### GET /api/admin/users/stats
사용자 통계

---

### GET /api/admin/users/:id
사용자 상세 (수강/개설 강의 포함)

---

### PUT /api/admin/users/:id/status
사용자 상태 변경 (활성화/비활성화)

**Request Body**:
```json
{
  "active": false
}
```

---

### GET /api/admin/stats/overview
전체 통계 요약

**Response (200)**:
```json
{
  "totalUsers": 500,
  "totalCourses": 50,
  "totalRevenue": 25000000,
  "todaySignups": 5,
  "todayEnrollments": 12
}
```

---

### GET /api/admin/stats/revenue
매출 추이

**Query**: `?period=daily|weekly|monthly`

---

### GET /api/admin/stats/popular-courses
인기 강의 TOP 10

---

### GET /api/admin/stats/activities
최근 활동 로그

---

### GET /api/admin/stats/real-time
실시간 통계

---

## 부록: 역할별 권한 요약

| 기능 | student | instructor | parent | admin |
|------|---------|------------|--------|-------|
| 강의 조회 | O | O | O | O |
| 수강 신청 | O | - | - | - |
| 강의 생성/수정 | - | O (본인) | - | O |
| 출석 관리 | - | O (본인) | - | O |
| 과제 채점 | - | O (본인) | - | O |
| 자료 업로드 | - | O (본인) | - | O |
| 자녀 모니터링 | - | - | O | - |
| 사용자 관리 | - | - | - | O |
| 통계 조회 | - | - | - | O |

---

## 부록: 데이터 타입

### 역할 (Role)
```
"student" | "instructor" | "parent" | "admin"
```

### 강의 상태 (Course Status)
```
"draft" | "published" | "cancelled"
```

### 수강 상태 (Enrollment Status)
```
"active" | "dropped" | "completed"
```

### 출석 상태 (Attendance Status)
```
"present" | "absent" | "late" | "excused"
```

### 과제 제출 상태 (Submission Status)
```
"submitted" | "late" | "graded"
```

### 요일 (Day of Week)
```
1=월, 2=화, 3=수, 4=목, 5=금, 6=토, 7=일
```
