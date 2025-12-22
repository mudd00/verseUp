# REST API 레퍼런스

> VerseUp 백엔드 REST API 명세

**최종 업데이트**: 2024-12-22
**Base URL**: `/api`

---

## 목차

1. [인증](#1-인증-auth)
2. [강의](#2-강의-courses)
3. [수강신청](#3-수강신청-enrollments)
4. [교실](#4-교실-classrooms)
5. [과제](#5-과제-assignments)
6. [알림](#6-알림-notifications)
7. [결제](#7-결제-payments)
8. [관리자](#8-관리자-admin)

---

## 공통 사항

### 인증 헤더
인증이 필요한 엔드포인트는 다음 헤더를 포함해야 합니다:
```
Authorization: Bearer {accessToken}
```

### 에러 응답 형식
```json
{
  "error": "에러 메시지"
}
```

### 역할 (Role)
- `student`: 학생
- `instructor`: 강사
- `admin`: 관리자

---

## 1. 인증 (Auth)

### GET /api/auth/me
현재 로그인한 사용자 정보 조회

**인증 필요**: Yes

**응답**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "사용자명",
    "role": "student",
    "avatar_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 2. 강의 (Courses)

### GET /api/courses
강의 목록 조회

**인증 필요**: No

**쿼리 파라미터**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| category | string | No | 카테고리 필터 |
| level | string | No | 난이도 필터 |
| search | string | No | 검색어 |
| page | number | No | 페이지 번호 (기본: 1) |
| limit | number | No | 페이지당 항목 수 (기본: 10) |

**응답**
```json
{
  "courses": [
    {
      "id": "uuid",
      "title": "강의 제목",
      "description": "설명",
      "instructor": {
        "id": "uuid",
        "name": "강사명"
      },
      "category": "programming",
      "level": "beginner",
      "price": 50000,
      "thumbnail_url": "https://...",
      "max_students": 30,
      "enrolled_count": 15,
      "start_date": "2024-01-15",
      "weeks": 8,
      "is_published": true
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

---

### GET /api/courses/:id
강의 상세 조회

**인증 필요**: No

**응답**
```json
{
  "course": {
    "id": "uuid",
    "title": "강의 제목",
    "description": "상세 설명",
    "instructor": {
      "id": "uuid",
      "name": "강사명",
      "email": "instructor@example.com",
      "avatar_url": "https://..."
    },
    "classroom": {
      "id": "uuid",
      "name": "강의실 A"
    },
    "time_slot": {
      "day_of_week": "monday",
      "start_time": "10:00",
      "end_time": "12:00"
    },
    "category": "programming",
    "level": "beginner",
    "price": 50000,
    "max_students": 30,
    "start_date": "2024-01-15",
    "weeks": 8,
    "materials": [...],
    "assignments": [...]
  }
}
```

---

### POST /api/courses
강의 생성

**인증 필요**: Yes
**필요 역할**: instructor, admin

**요청 본문**
```json
{
  "title": "강의 제목",
  "description": "설명",
  "classroomId": "uuid",
  "timeSlotId": "uuid",
  "category": "programming",
  "level": "beginner",
  "price": 50000,
  "maxStudents": 30,
  "startDate": "2024-01-15",
  "weeks": 8,
  "thumbnailUrl": "https://..."
}
```

**응답**: 201 Created
```json
{
  "course": { ... },
  "message": "강의가 생성되었습니다."
}
```

---

### PUT /api/courses/:id
강의 수정

**인증 필요**: Yes
**필요 역할**: instructor (본인 강의만), admin

**요청 본문**: POST와 동일 (부분 업데이트 가능)

**응답**: 200 OK

---

### DELETE /api/courses/:id
강의 삭제

**인증 필요**: Yes
**필요 역할**: instructor (본인 강의만), admin

**응답**: 200 OK

---

### GET /api/courses/my-courses
내 강의 목록 (강사용)

**인증 필요**: Yes
**필요 역할**: instructor

**응답**
```json
{
  "courses": [...]
}
```

---

## 3. 수강신청 (Enrollments)

### GET /api/enrollments
내 수강 목록

**인증 필요**: Yes

**응답**
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "course": { ... },
      "status": "enrolled",
      "enrolled_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/enrollments
수강 신청

**인증 필요**: Yes

**요청 본문**
```json
{
  "courseId": "uuid",
  "paymentId": "uuid"
}
```

**응답**: 201 Created

---

### DELETE /api/enrollments/:id
수강 취소

**인증 필요**: Yes

**응답**: 200 OK

---

## 4. 교실 (Classrooms)

### GET /api/classrooms
교실 목록 조회

**인증 필요**: No

**응답**
```json
{
  "classrooms": [
    {
      "id": "uuid",
      "name": "강의실 A",
      "capacity": 50
    }
  ]
}
```

---

### GET /api/classrooms/:id/check-access
교실 접근 권한 확인

**인증 필요**: Yes

**응답**
```json
{
  "hasAccess": true,
  "reason": "enrolled",
  "message": "수강 중인 강의가 있어 입장할 수 있습니다."
}
```

**reason 종류**:
- `instructor`: 강사
- `enrolled`: 수강 중
- `admin`: 관리자
- `no_enrollment`: 수강 중인 강의 없음

---

### GET /api/classrooms/:id/time-slots
교실의 사용 가능한 시간대

**인증 필요**: No

**응답**
```json
{
  "timeSlots": [
    {
      "id": "uuid",
      "day_of_week": "monday",
      "start_time": "10:00",
      "end_time": "12:00",
      "is_available": true
    }
  ]
}
```

---

## 5. 과제 (Assignments)

### GET /api/courses/:courseId/assignments
강의의 과제 목록

**인증 필요**: Yes

**응답**
```json
{
  "assignments": [
    {
      "id": "uuid",
      "title": "과제 제목",
      "description": "설명",
      "due_date": "2024-01-31T23:59:59Z",
      "max_score": 100,
      "submission": {
        "id": "uuid",
        "submitted_at": "2024-01-30T12:00:00Z",
        "grade": 95,
        "feedback": "잘했습니다"
      }
    }
  ]
}
```

---

### POST /api/courses/:courseId/assignments
과제 생성 (강사용)

**인증 필요**: Yes
**필요 역할**: instructor

**요청 본문**
```json
{
  "title": "과제 제목",
  "description": "설명",
  "dueDate": "2024-01-31T23:59:59Z",
  "maxScore": 100
}
```

---

### POST /api/assignments/:id/submit
과제 제출 (학생용)

**인증 필요**: Yes

**요청 본문**
```json
{
  "content": "제출 내용",
  "fileUrl": "https://..."
}
```

---

### POST /api/assignments/:id/grade
과제 채점 (강사용)

**인증 필요**: Yes
**필요 역할**: instructor

**요청 본문**
```json
{
  "submissionId": "uuid",
  "grade": 95,
  "feedback": "피드백 내용"
}
```

---

## 6. 알림 (Notifications)

### GET /api/notifications
알림 목록

**인증 필요**: Yes

**쿼리 파라미터**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| unread | boolean | No | 읽지 않은 알림만 |

**응답**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "course_enrolled",
      "title": "수강 신청 완료",
      "message": "React 마스터 과정에 수강 신청되었습니다.",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00Z",
      "data": {
        "courseId": "uuid"
      }
    }
  ]
}
```

**알림 타입**:
- `course_enrolled`: 수강 신청 완료
- `assignment_created`: 새 과제 등록
- `assignment_graded`: 과제 채점 완료
- `course_started`: 강의 시작
- `payment_completed`: 결제 완료
- `enrollment_cancelled`: 수강 취소
- `system`: 시스템 알림
- `admin`: 관리자 알림

---

### PUT /api/notifications/:id/read
알림 읽음 처리

**인증 필요**: Yes

**응답**: 200 OK

---

### PUT /api/notifications/read-all
모든 알림 읽음 처리

**인증 필요**: Yes

**응답**: 200 OK

---

## 7. 결제 (Payments)

### POST /api/payments/confirm
결제 확인 (Toss Payments)

**인증 필요**: Yes

**요청 본문**
```json
{
  "orderId": "order_xxx",
  "paymentKey": "payment_key_xxx",
  "amount": 50000
}
```

**응답**
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "order_id": "order_xxx",
    "amount": 50000,
    "status": "DONE",
    "method": "카드"
  }
}
```

---

### GET /api/payments
결제 내역 조회

**인증 필요**: Yes

**응답**
```json
{
  "payments": [
    {
      "id": "uuid",
      "course": { ... },
      "amount": 50000,
      "status": "DONE",
      "method": "카드",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 8. 관리자 (Admin)

### GET /api/admin/users
사용자 목록 (관리자용)

**인증 필요**: Yes
**필요 역할**: admin

**응답**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "사용자명",
      "role": "student",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### PUT /api/admin/users/:id/role
사용자 역할 변경

**인증 필요**: Yes
**필요 역할**: admin

**요청 본문**
```json
{
  "role": "instructor"
}
```

---

### GET /api/admin/stats
통계 데이터

**인증 필요**: Yes
**필요 역할**: admin

**응답**
```json
{
  "stats": {
    "totalUsers": 150,
    "totalCourses": 25,
    "totalEnrollments": 500,
    "totalRevenue": 25000000
  }
}
```

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|-----------|--------|
| 2024-12-22 | 초기 API 명세 작성 | Claude |

