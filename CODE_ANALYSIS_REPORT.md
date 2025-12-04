# VerseUp 프로젝트 코드 분석 보고서

분석 일자: 2025-12-04

## 📊 분석 개요

강의 신청, 강의 개설, 강의 취소, 결제, 환불 로직 및 API 키 관리에 대한 종합 분석

---

## 1. ✅ 환경 변수 및 API 키 관리

### 현재 구조

**프론트엔드 (Vite - `VITE_` 접두사)**
```
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_TOSS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q4wVN97Eoqe
```

**백엔드 (Node.js)**
```
PORT=3000
NODE_ENV=development
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
JWT_SECRET=your-jwt-secret-key
TOSS_SECRET_KEY=test_sk_your_secret_key
```

### ⚠️ 발견된 문제

#### 1.1 API 베이스 URL 중복 문제 ✅ 수정 완료
- **문제**: `apiService`가 이미 `/api` 베이스 URL을 포함하는데, 일부 코드에서 `/api/...` 경로 사용
- **영향**: `/api/api/payments/refund` 같은 잘못된 URL 생성
- **수정**: 모든 API 호출에서 `/api` 접두사 제거
  - `enrollmentService.js:136` - `/payments/refund`
  - `PaymentSuccess.jsx:40` - `/payments/confirm`
  - `PaymentHistory.jsx:22,34` - `/payments`, `/payments/refunds`

#### 1.2 환경 변수 검증 부족
- **위치**: `src/lib/supabase.js:6-8`, `server/utils/supabase.js:9-11`
- **현재**: `console.warn`만 출력
- **문제**: placeholder 값으로 클라이언트 생성 → 런타임 오류 발생 가능
```javascript
// 현재 코드
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured.')
}
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', // ⚠️ 위험
  supabaseAnonKey || 'placeholder-anon-key'
)
```

**권장 수정**:
```javascript
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set')
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### 1.3 Toss Payments 테스트 키 노출
- **위치**: `.env.example:31`
- **문제**: 실제 테스트 클라이언트 키가 하드코딩됨
- **권장**: placeholder로 교체

---

## 2. ✅ 강의 신청 로직 분석

### 구현 위치
- **프론트엔드**: `src/services/enrollmentService.js:9-63`
- **백엔드**: 클라이언트에서 직접 Supabase 사용 (백엔드 API 없음)

### 로직 흐름

```
1. 로그인 확인 (currentUser 존재 여부)
2. 중복 수강 확인 (status='active' enrollment 조회)
3. 강의 정원 확인 (enrolled_count < max_students)
4. 수강 신청 생성 (enrollments 테이블 INSERT)
5. DB 트리거가 자동으로 enrolled_count 증가
```

### ⚠️ 발견된 문제

#### 2.1 백엔드 API 미사용 ⚠️ 중요
- **문제**: 프론트엔드에서 직접 Supabase로 수강 신청
- **위험**:
  - RLS 정책에 전적으로 의존
  - 비즈니스 로직 검증 부족
  - Race condition 가능 (동시 신청 시 정원 초과 위험)
- **증거**: `server/routes/courses.js:59-68` - TODO 주석만 있음

**현재 코드**:
```javascript
// server/routes/courses.js
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    // TODO: Implement actual enrollment logic  // ⚠️ 미구현
    res.json({ message: 'Enrolled successfully', courseId: id })
  } catch (error) {
    console.error('Error enrolling:', error)
    res.status(500).json({ error: 'Failed to enroll' })
  }
})
```

#### 2.2 정원 확인 Race Condition
- **위치**: `enrollmentService.js:30-42`
- **문제**: 조회와 INSERT 사이에 시간 차 존재
```javascript
// 1. 정원 확인
const { data: course } = await supabase
  .from('courses')
  .select('max_students, enrolled_count')
  .eq('id', courseId)
  .single()

if (course.enrolled_count >= course.max_students) {
  throw new Error('수강 정원이 초과되었습니다.')
}

// 2. 수강 신청 (이 사이에 다른 사용자가 신청할 수 있음)
const { data: enrollment } = await supabase
  .from('enrollments')
  .insert({...})
```

**권장 해결책**:
- DB 트랜잭션 사용
- 또는 CHECK constraint로 enrolled_count <= max_students 강제

#### 2.3 무료 vs 유료 강의 처리 분리 부족
- **위치**: `CourseDetail.jsx:80-101`
- **문제**: 유료 강의는 결제 후 enrollments 생성, 무료는 바로 생성
- **불일치**: 두 경로에서 서로 다른 로직 사용

---

## 3. ✅ 강의 개설 로직 분석

### 구현 위치
- **프론트엔드**: `src/services/courseService.js:8-52`
- **페이지**: `src/pages/CreateCourse.jsx`

### 로직 흐름

```
1. 강사 권한 확인 (role === 'instructor' || 'admin')
2. 폼 데이터 검증 (title, description, dates)
3. course_code 자동 생성 또는 사용자 입력
4. courses 테이블에 INSERT (status='draft')
5. 강사 정보와 함께 반환
```

### ⚠️ 발견된 문제

#### 3.1 course_code 중복 검사 없음
- **위치**: `courseService.js:26`, `CreateCourse.jsx:96`
- **문제**: 사용자가 입력한 course_code 중복 여부 미확인
- **결과**: DB UNIQUE constraint 위반 시 오류

**권장 수정**:
```javascript
if (formData.courseCode) {
  // 중복 검사
  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('course_code', formData.courseCode)
    .single()

  if (existing) {
    throw new Error('이미 사용 중인 수강번호입니다.')
  }
}
```

#### 3.2 자동 생성 로직 부재
- **문제**: 비워두면 자동 생성된다고 안내하지만 실제 로직 없음
- **위치**: `CreateCourse.jsx:164` - "비워두면 자동 생성됩니다"
- **실제**: DB DEFAULT 값이나 트리거에 의존

#### 3.3 날짜 검증 클라이언트 사이드만
- **위치**: `CreateCourse.jsx:91-93`
- **문제**: 서버 사이드 검증 없음
```javascript
if (new Date(formData.endDate) <= new Date(formData.startDate)) {
  throw new Error('종료일은 시작일보다 나중이어야 합니다.')
}
```

---

## 4. ✅ 강의 취소/삭제 로직 분석

### 수강 취소 (환불)
- **위치**: `enrollmentService.js:128-142`
- **로직**: `/api/payments/refund` 백엔드 호출 → 환불 처리

### 강의 삭제 (강사)
- **위치**: `courseService.js:178-192`
- **로직**: courses 테이블에서 DELETE

### ⚠️ 발견된 문제

#### 4.1 Deprecated dropCourse 메서드 존재
- **위치**: `enrollmentService.js:69-87`
- **문제**: `@deprecated` 태그는 있지만 여전히 노출
- **권장**: private 메서드로 변경 또는 완전 제거

#### 4.2 강의 삭제 시 수강생 확인 없음
- **위치**: `courseService.js:186`
- **문제**: enrolled_count > 0인 강의도 삭제 가능
- **위험**: 수강 중인 학생 데이터 무결성 파괴

**권장 수정**:
```javascript
async deleteCourse(id) {
  const { data: course } = await supabase
    .from('courses')
    .select('enrolled_count')
    .eq('id', id)
    .single()

  if (course && course.enrolled_count > 0) {
    throw new Error('수강 중인 학생이 있어 삭제할 수 없습니다.')
  }

  // 삭제 진행
}
```

#### 4.3 CASCADE 삭제 의존
- **문제**: `ON DELETE CASCADE`에만 의존
- **결과**: enrollments, materials 등 자동 삭제
- **권장**: 명시적 확인 로직 추가

---

## 5. ✅ 결제 로직 분석

### 구현 위치
- **백엔드**: `server/routes/payments.js:13-183`
- **프론트엔드**: `src/pages/Payment.jsx`, `PaymentSuccess.jsx`

### 로직 흐름

```
1. 결제창 호출 (Toss Payments SDK)
2. 결제 완료 후 redirect → PaymentSuccess
3. 백엔드 /api/payments/confirm 호출
4. Toss API로 결제 승인 요청
5. payments 테이블에 저장
6. orderId에서 courseId 추출
7. enrollments 생성 (또는 재활성화)
8. DB 트리거가 enrolled_count 증가
```

### ✅ 잘 구현된 부분

1. **중복 수강 처리**: existing enrollment를 active로 변경
2. **트랜잭션 안정성**: 결제 성공 후에만 enrollment 생성
3. **로깅**: 각 단계마다 상세한 로그

### ⚠️ 발견된 문제

#### 5.1 orderId 파싱 로직 취약
- **위치**: `payments.js:91-96`
```javascript
// orderId 형식: ORDER_{courseId}_{timestamp}
if (orderId && orderId.startsWith('ORDER_')) {
  const parts = orderId.split('_')
  if (parts.length >= 2) {
    courseId = parts.slice(1, -1).join('_') // ⚠️ 마지막 제외
  }
}
```

**문제**:
- courseId에 `_`가 포함되면 파싱 오류
- 예: `ORDER_abc_def_123` → `abc_def`로 추출 (정확함)
- 예: `ORDER_abc_123_456` → `abc_123`로 추출 (마지막 timestamp 456은 제외됨)

**권장**:
```javascript
// 더 명확한 구분자 사용 또는 metadata 사용
const orderId = `ORDER_${courseId}_${Date.now()}`
// 또는 Toss metadata 필드 활용
```

#### 5.2 payment.is_refunded 필드 존재 확인 필요
- **위치**: `payments.js:399`
```javascript
if (enrollment.payment.is_refunded) {  // ⚠️ 필드 존재?
  return res.status(400).json({ error: '이미 환불된 결제입니다.' })
}
```

**문제**: payments 테이블 스키마에 `is_refunded` 컬럼이 있는지 미확인

#### 5.3 수강 신청 실패 시 결제는 성공
- **위치**: `payments.js:154-163`
- **문제**: enrollment 생성 실패해도 결제는 승인됨
- **결과**: 사용자는 돈만 내고 수강 못함

**권장**:
```javascript
// enrollmentId가 null이면 환불 처리 또는 에러 반환
if (!enrollmentId) {
  // 자동 환불 로직 추가
  return res.status(500).json({
    error: '수강 신청 실패. 환불 처리 중입니다.'
  })
}
```

---

## 6. ✅ 환불 로직 분석

### 구현 위치
- **백엔드**: `server/routes/payments.js:361-519`
- **프론트엔드**: `enrollmentService.js:128-142`

### 로직 흐름

```
1. enrollmentId로 수강 신청 조회 (payment 정보 포함)
2. 강의 시작일 기준 환불율 계산
   - 7일 전: 100%
   - 7일 이내: 70%
   - 시작 후: 0% (불가)
3. Toss API로 부분 환불 요청
4. refunds 테이블에 저장
5. enrollment status를 'dropped'로 변경
6. DB 트리거가 enrolled_count 감소
```

### ✅ 잘 구현된 부분

1. **환불 정책 명확**: 날짜 기반 자동 계산
2. **부분 환불**: `cancelAmount` 지원
3. **트리거 활용**: enrolled_count 자동 관리

### ⚠️ 발견된 문제

#### 6.1 무료 강의 환불 처리 없음
- **문제**: price=0인 강의는 payment가 없음
- **결과**: `enrollmentService.js`에서 무료 강의는 직접 `dropCourse()` 호출해야 함
- **불일치**: 유료/무료 경로 분리

**권장**:
```javascript
async refundEnrollment(enrollmentId) {
  // 1. enrollment 조회
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*, course:courses(*)')
    .eq('id', enrollmentId)
    .single()

  // 2. 무료 강의 처리
  if (enrollment.course.price === 0 || !enrollment.payment_id) {
    return this.dropCourseFree(enrollmentId)
  }

  // 3. 유료 강의 환불
  return apiService.post('/payments/refund', { enrollmentId })
}
```

#### 6.2 환불 실패 시 enrollment 상태 일관성
- **위치**: `payments.js:489-500`
- **문제**: Toss 환불은 성공했지만 DB 업데이트 실패 시 불일치

**권장**: DB 트랜잭션 사용

#### 6.3 환불 중복 요청 방지 부족
- **위치**: `payments.js:388`
- **현재**: `status='active'`만 확인
- **문제**: 동시에 두 번 클릭 시 중복 환불 가능

**권장**:
```javascript
// refunds 테이블에 UNIQUE constraint 추가
ALTER TABLE refunds ADD CONSTRAINT unique_enrollment_refund
UNIQUE (enrollment_id);
```

---

## 7. 🔐 보안 취약점

### 7.1 클라이언트에서 직접 Supabase 사용
- **위치**: 모든 `courseService.js`, `enrollmentService.js`
- **위험**: RLS 우회 가능성, 비즈니스 로직 노출
- **권장**: 백엔드 API 사용

### 7.2 TOSS_SECRET_KEY 환경 변수 의존
- **위치**: `payments.js:7`
- **문제**: 키 누락 시 'test_sk_your_secret_key' 사용
- **권장**: 키 없으면 서버 시작 실패

### 7.3 Auth 미들웨어 JWT 검증만
- **위치**: `server/middleware/auth.js` (미제공)
- **문제**: role 기반 권한 확인 없음
- **예**: 학생이 강의 삭제 API 호출 가능

---

## 8. 📊 데이터 일관성 문제

### 8.1 enrolled_count 트리거 의존
- **문제**: 트리거 실패 시 수동 복구 필요
- **권장**: 정기적인 일관성 검사 스케줄러

### 8.2 CASCADE 삭제 부작용
- **문제**: 강의 삭제 시 모든 연관 데이터 자동 삭제
- **권장**: soft delete (status='archived')

### 8.3 payment_id 누락 가능성
- **위치**: `payments.js:127, 149`
- **문제**: `savedPayment?.id` - 실패 시 null
- **결과**: enrollment에 payment 연결 안 됨

---

## 9. ✅ 성능 최적화 기회

### 9.1 N+1 쿼리 가능성
- **위치**: `courseService.js:58-74`
- **문제**: JOIN으로 instructor 조회하지만 매번 새로 조회

### 9.2 인덱스 확인 필요
```sql
-- 권장 인덱스
CREATE INDEX idx_enrollments_student_course
ON enrollments(student_id, course_id, status);

CREATE INDEX idx_payments_user_created
ON payments(user_id, created_at DESC);
```

---

## 10. 🎯 우선순위별 권장 조치

### 🔴 High Priority (즉시 수정)

1. **백엔드 수강 신청 API 구현** (`courses.js:59`)
   - Race condition 방지
   - 트랜잭션 사용

2. **환경 변수 검증 강화**
   - placeholder 제거
   - 서버 시작 시 검증

3. **결제 성공 후 수강 신청 실패 처리**
   - 자동 환불 또는 에러 반환

4. **강의 삭제 시 수강생 확인**
   - enrolled_count > 0이면 삭제 불가

### 🟡 Medium Priority (1-2주 내)

5. **무료/유료 강의 통합 처리**
   - 단일 경로로 통합

6. **course_code 중복 검사**
   - 자동 생성 로직 추가

7. **환불 중복 방지**
   - UNIQUE constraint 추가

8. **권한 미들웨어 강화**
   - role 기반 접근 제어

### 🟢 Low Priority (추후 개선)

9. **백엔드 API 전환**
   - 클라이언트 Supabase 사용 최소화

10. **인덱스 최적화**
    - 쿼리 성능 분석 후 추가

---

## 11. 📋 체크리스트

### 환경 설정
- [ ] `.env` 파일에 모든 필수 변수 설정
- [ ] Supabase URL 및 키 유효성 확인
- [ ] Toss Payments 키 발급 및 설정

### 데이터베이스
- [ ] `course_materials` 테이블 생성 (마이그레이션 014)
- [ ] Storage 버킷 `course-materials` 생성
- [ ] Storage RLS 정책 3개 적용
- [ ] enrolled_count 트리거 동작 확인

### 백엔드 API
- [ ] 수강 신청 API 구현 (`POST /api/courses/:id/enroll`)
- [ ] 환경 변수 검증 추가
- [ ] 결제 실패 처리 로직 추가

### 프론트엔드
- [ ] API 경로 중복 제거 (✅ 완료)
- [ ] 무료/유료 강의 처리 통합
- [ ] 에러 메시지 개선

---

## 12. 결론

### 🎉 잘 구현된 부분
- 환불 정책 시스템
- DB 트리거 활용
- Toss Payments 통합
- 결제 로깅

### ⚠️ 개선 필요 부분
- 백엔드 API 미구현 (수강 신청)
- Race condition 위험
- 클라이언트 Supabase 직접 사용
- 환경 변수 검증 부족

### 📌 다음 단계
1. High Priority 항목부터 순차적으로 수정
2. 단위 테스트 추가
3. E2E 테스트 (결제 플로우)
4. 성능 테스트 (동시 수강 신청)

---

**보고서 작성자**: Claude Code
**검토 대상**: VerseUp 프로젝트 전체
**분석 파일 수**: 15개
**발견된 이슈**: High 4개, Medium 4개, Low 2개
