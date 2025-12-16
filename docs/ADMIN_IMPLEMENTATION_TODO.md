# 관리자 페이지 구현 투두리스트

## 📊 프로젝트 분석 결과

### 현재 구현된 기능
- **학생 대시보드**: 수강 강의, 시간표, 환불 요청
- **강사 대시보드**: 강의 생성/관리, 통계 조회, 자료 업로드
- **강의 시스템**: CRUD, 수강 신청, 강의실/시간표 관리
- **결제 시스템**: 토스페이먼츠 연동, 환불 처리
- **인증 시스템**: Supabase Auth, 역할 기반 접근 제어 (student/instructor/admin)
- **메타버스**: 3D 가상 환경, 캐릭터 이동

### 데이터베이스 구조
- `profiles`: 사용자 정보 (role, name, email 등)
- `courses`: 강의 정보 (강사, 강의실, 시간표, 가격 등)
- `enrollments`: 수강 신청 (상태: active/dropped)
- `payments`: 결제 내역
- `refunds`: 환불 내역
- `classrooms`: 강의실 정보
- `time_slots`: 시간표 슬롯
- `course_materials`: 강의 자료

---

## 🎯 관리자가 관리해야 할 핵심 기능

### 1. **사용자 관리**
- 전체 사용자 목록 조회 (학생/강사/관리자)
- 사용자 역할 변경 (학생 ↔ 강사 승급/강등) -> 사용자 역할 변경은 하지 않습니다.
- 사용자 계정 활성화/비활성화
- 사용자 통계 (가입자 수, 역할별 분포)

### 2. **강의 관리**
- 전체 강의 목록 조회 (모든 상태)
- 강의 승인/거부 (draft → published 심사) -> 현재 강사가 강의를 생성하면 초안 상태로 유지하게 되는데 이 때 관리자의 승인이 있다면 초안 상태를 공개 상태로 바꿀 수 있게 해야합니다.
- 강의 강제 종료/삭제
- 강의 카테고리/레벨 관리
- 강의 통계 (총 강의 수, 카테고리별 분포, 인기 강의)

### 3. **수강 관리**
- 전체 수강 신청 내역 조회
- 수강 신청 강제 취소/승인
- 정원 초과 시 대기자 관리
- 수강 통계 (총 수강 건수, 취소율)

### 4. **결제 및 환불 관리**
- 전체 결제 내역 조회
- 환불 요청 승인/거부
- 수동 환불 처리
- 결제/환불 통계 (총 매출, 환불액, 환불율)

### 5. **강의실 및 시간표 관리**
- 강의실 추가/수정/삭제
- 시간표 슬롯 관리
- 강의실 이용률 통계

### 6. **시스템 통계 대시보드**
- 실시간 통계 (오늘의 가입자, 수강 신청, 결제)
- 매출 추이 그래프
- 인기 강의 TOP 10
- 시스템 활동 로그

### 7. **공지사항 및 신고 관리** (향후 구현)
- 공지사항 작성/관리
- 신고 접수 및 처리

---

## 📋 구현 Phase 별 상세 투두리스트

### **Phase 1: 기본 구조 및 사용자 관리** ✅

#### 1.1 관리자 대시보드 레이아웃 구성
- [x] `src/components/dashboard/AdminDashboard.jsx` 컴포넌트 생성
- [x] 사이드바 네비게이션 컴포넌트 구현
  - [x] 메뉴 항목: 대시보드, 사용자, 강의, 수강, 결제, 강의실, 설정
  - [x] 현재 활성 메뉴 하이라이트
- [x] 통계 카드 레이아웃 구현
  - [x] 총 사용자 수
  - [x] 총 강의 수
  - [x] 총 매출
  - [x] 오늘의 활동 (가입, 수강 신청)
- [x] `src/pages/Dashboard.jsx` 수정 - admin 역할일 때 AdminDashboard 렌더링

#### 1.2 사용자 관리 페이지
- [x] `src/components/admin/UserManagement.jsx` 컴포넌트 생성
- [x] 사용자 목록 테이블 구현
  - [x] 컬럼: 이름, 이메일, 역할, 가입일, 상태
  - [x] 검색 기능 (이름/이메일)
  - [x] 역할별 필터 (전체/학생/강사/관리자)
  - [x] 페이지네이션
- [x] 사용자 상세 정보 모달
  - [x] 기본 정보 (이름, 이메일, 프로필 이미지)
  - [x] 수강 내역 (학생인 경우)
  - [x] 개설 강의 내역 (강사인 경우)
- [x] ~~역할 변경 기능~~ (요구사항에서 제외)
  - [x] ~~드롭다운 선택 UI~~
  - [x] ~~확인 모달~~
  - [x] ~~API 호출 및 상태 업데이트~~
- [x] 계정 상태 변경 토글
  - [x] 활성화/비활성화 스위치
  - [x] 확인 다이얼로그

#### 1.3 사용자 관리 백엔드 API
- [x] `server/middleware/adminAuth.js` 미들웨어 생성 (requireAdmin으로 구현)
  - [x] admin 역할 검증
  - [x] 권한 없을 시 403 에러 반환
- [x] `server/routes/admin/users.js` 라우트 생성
  - [x] `GET /api/admin/users` - 전체 사용자 목록
    - [x] 쿼리 파라미터: page, limit, search, role
    - [x] 페이지네이션 처리
  - [x] `GET /api/admin/users/:id` - 사용자 상세
  - [x] ~~`PUT /api/admin/users/:id/role` - 역할 변경~~ (요구사항에서 제외)
  - [x] `PUT /api/admin/users/:id/status` - 계정 상태 변경
  - [x] `GET /api/admin/users/stats` - 사용자 통계
- [x] `server/routes/index.js`에 admin 라우트 등록

---

### **Phase 2: 강의 관리** ✅

#### 2.1 강의 관리 페이지
- [x] `src/components/admin/CourseManagement.jsx` 컴포넌트 생성
- [x] 강의 목록 테이블 구현
  - [x] 컬럼: 제목, 강사, 카테고리, 수강인원/정원, 상태, 생성일
  - [x] 상태별 필터 (전체/published/draft/archived)
  - [x] 검색 기능 (강의명, 강사명)
  - [x] 정렬 기능
- [x] 강의 상세 정보 모달
  - [x] 강의 기본 정보
  - [x] 수강생 목록
  - [x] 결제 통계
- [x] 강의 상태 변경 기능
  - [x] 승인/거부/아카이브 버튼
  - [x] 거부 시 사유 입력 모달
- [x] 강의 강제 삭제 기능
  - [x] 경고 모달
  - [x] 수강생 있을 경우 추가 확인

#### 2.2 강의 통계 차트
- [x] Chart 라이브러리 설치 (Recharts)
- [ ] 카테고리별 강의 분포 차트 (향후 구현)
- [ ] 월별 강의 개설 추이 그래프 (향후 구현)
- [x] 인기 강의 TOP 10 리스트 (BarChart 구현 완료)

#### 2.3 강의 관리 백엔드 API
- [x] `server/routes/admin/courses.js` 라우트 생성
  - [x] `GET /api/admin/courses` - 전체 강의 목록 (상태 무관)
    - [x] 쿼리 파라미터: page, limit, search, status
  - [x] `GET /api/admin/courses/:id` - 강의 상세 (수강생 포함)
  - [x] `PUT /api/admin/courses/:id/status` - 강의 상태 변경
  - [x] `DELETE /api/admin/courses/:id` - 강의 강제 삭제
  - [x] `GET /api/admin/courses/stats` - 강의 통계

---

### **Phase 3: 수강 및 결제 관리** ✅

#### 3.1 수강 관리 페이지
- [x] `src/components/admin/EnrollmentManagement.jsx` 컴포넌트 생성
- [x] 수강 신청 목록 테이블
  - [x] 컬럼: 학생명, 강의명, 수강일, 상태, 결제 여부
  - [x] 상태별 필터 (active/dropped)
  - [x] 날짜 범위 필터 (시작일/종료일)
- [x] 수강 취소 기능
  - [x] 강제 취소 버튼
  - [x] 환불 처리 옵션
- [x] 수강 통계
  - [x] 총 수강 건수
  - [x] 취소율
  - [x] 강의별 수강 현황

#### 3.2 결제 및 환불 관리 페이지
- [x] `src/components/admin/PaymentManagement.jsx` 컴포넌트 생성
- [x] 결제 내역 테이블
  - [x] 컬럼: 주문번호, 사용자, 강의, 금액, 결제일, 상태
  - [x] 날짜 범위 필터 (시작일/종료일)
  - [x] 결제 상태 필터 (DONE/PENDING/CANCELLED)
- [x] 환불 관리 섹션
  - [x] 환불 요청 목록
  - [x] 승인/거부 버튼
  - [x] 수동 환불 처리 폼 (모달 UI)
- [x] 매출 통계 및 차트
  - [x] 일별/주별/월별 매출 그래프 (대시보드에 구현)
  - [x] 총 매출, 환불액, 순수익 표시

#### 3.3 결제/환불 관리 백엔드 API
- [x] `server/routes/admin/payments.js` 라우트 생성
  - [x] `GET /api/admin/payments` - 전체 결제 내역 (날짜/상태 필터 지원)
  - [ ] `GET /api/admin/payments/:id` - 결제 상세 (향후 구현)
  - [x] `GET /api/admin/refunds` - 전체 환불 내역
  - [x] `POST /api/admin/refunds/:id/approve` - 환불 승인
  - [x] `POST /api/admin/refunds/:id/reject` - 환불 거부
  - [x] `POST /api/admin/refunds/manual` - 수동 환불 처리
  - [x] `GET /api/admin/payments/stats` - 결제/환불 통계
- [x] `server/routes/admin/enrollments.js` 라우트 생성
  - [x] `GET /api/admin/enrollments` - 전체 수강 내역 (날짜 필터 지원)
  - [x] `DELETE /api/admin/enrollments/:id` - 수강 강제 취소
  - [x] `GET /api/admin/enrollments/stats` - 수강 통계

---

### **Phase 4: 강의실 및 시간표 관리** ✅ (100%)

#### 4.1 강의실 관리 페이지
- [x] `src/components/admin/ClassroomManagement.jsx` 컴포넌트 생성
- [x] 강의실 목록 테이블
  - [x] 컬럼: 이름, 설명, 수용인원, 이용 중인 강의 수, 상태
  - [x] 추가 버튼
  - [x] 통계 카드 (전체/사용중/비활성)
- [x] 강의실 추가/수정 모달
  - [x] 폼: 이름, 설명, 수용인원
  - [x] 유효성 검사
- [x] 강의실 삭제 기능
  - [x] 사용 중인 강의 확인
  - [x] 확인 다이얼로그
  - [x] 실제로는 status를 'inactive'로 변경

#### 4.2 시간표 슬롯 관리
- [x] 시간표 슬롯 목록 테이블
  - [x] 컬럼: 요일, 시작시간, 종료시간, 순서
- [x] 시간표 슬롯 추가/수정/삭제 기능
- [ ] 강의실 이용률 통계 (향후 구현)
  - [ ] 요일별 이용률
  - [ ] 시간대별 이용률

#### 4.3 강의실 관리 백엔드 API
- [x] `server/routes/admin/classrooms.js` 라우트 생성
  - [x] `GET /api/admin/classrooms` - 전체 강의실 목록 (inactive 포함, 강의 수 포함)
  - [x] `GET /api/admin/classrooms/:id` - 강의실 상세 (시간표, 강의 목록 포함)
  - [x] `POST /api/admin/classrooms` - 강의실 생성
  - [x] `PUT /api/admin/classrooms/:id` - 강의실 수정
  - [x] `DELETE /api/admin/classrooms/:id` - 강의실 삭제 (비활성화)
  - [x] `GET /api/admin/classrooms/stats` - 강의실 통계
- [x] 기존 `server/routes/classrooms.js` 활용 가능 (공개 API)

---

### **Phase 5: 통합 대시보드 및 통계** ✅

#### 5.1 통계 대시보드
- [x] 실시간 통계 카드 구현
  - [x] 오늘의 가입자 수
  - [x] 오늘의 수강 신청
  - [x] 오늘의 결제 건수 및 금액
  - [x] 전체 사용자/강의/매출 요약
- [x] 매출 추이 그래프
  - [x] 일별/주별/월별 전환 가능
  - [x] Recharts LineChart 사용
- [x] 인기 강의 TOP 10
  - [x] 수강생 수 기준 정렬
  - [x] Recharts 수평 BarChart 사용
- [x] 최근 활동 로그
  - [x] 실시간 활동 피드 (가입, 수강, 결제)
  - [x] 최근 15건 표시 및 색상 코딩

#### 5.2 통계 백엔드 API
- [x] `server/routes/admin/stats.js` 라우트 생성
  - [x] `GET /api/admin/stats/overview` - 전체 통계 요약
  - [x] `GET /api/admin/stats/revenue` - 매출 추이 (일별/주별/월별 데이터 그룹화)
    - [x] 쿼리 파라미터: period (daily/weekly/monthly)
  - [x] `GET /api/admin/stats/popular-courses` - 인기 강의 TOP 10
  - [x] `GET /api/admin/stats/activities` - 최근 활동 로그 (가입/수강/결제 통합)
  - [x] `GET /api/admin/stats/real-time` - 실시간 통계

---

### **Phase 6: 권한 및 보안 강화** ✅

#### 6.1 관리자 권한 체크 미들웨어
- [x] `server/middleware/adminAuth.js` 강화 (requireAdmin으로 구현)
  - [x] role === 'admin' 검증
  - [x] 403 에러 응답
  - [ ] 로깅 (관리자 액션 추적) - 향후 구현

#### 6.2 프론트엔드 권한 라우트 보호
- [x] `src/components/AdminRoute.jsx` 컴포넌트 생성
  - [x] admin role 체크
  - [x] 권한 없을 시 403 페이지로 리다이렉트
- [x] `src/pages/Forbidden.jsx` 생성 (403 에러 페이지)
- [x] `src/App.jsx`에 Admin 전용 라우트 추가
  - [x] `/admin/users` - 사용자 관리
  - [x] `/admin/courses` - 강의 관리
  - [x] `/admin/enrollments` - 수강 관리
  - [x] `/admin/payments` - 결제 관리
  - [x] `/admin/classrooms` - 강의실 관리

#### 6.3 보안 강화
- [ ] API rate limiting 설정 (express-rate-limit) - 향후 구현
- [x] 모든 admin API에 adminAuth 미들웨어 적용
- [x] 민감한 작업 (삭제, 환불 등)에 추가 확인 단계
- [ ] 관리자 활동 로깅 (DB 테이블 생성) - 향후 구현

---

## 🛠️ 기술 스택 및 라이브러리

### 추가 설치 필요
```bash
npm install recharts
npm install date-fns
npm install @tanstack/react-table
npm install lucide-react  # (이미 설치되어 있을 수 있음)
npm install express-rate-limit
```

### 사용할 라이브러리
- **차트**: Recharts
- **테이블**: TanStack Table (React Table v8) 또는 기본 HTML 테이블
- **날짜**: date-fns
- **아이콘**: Lucide React
- **폼 유효성 검사**: React Hook Form + Zod (선택 사항)

---

## 📌 우선순위

### High Priority (필수)
1. Phase 1: 사용자 관리
2. Phase 2: 강의 관리
3. Phase 5: 통합 대시보드
4. Phase 6: 권한 및 보안

### Medium Priority (중요)
1. Phase 3: 결제 및 환불 관리
2. Phase 4: 강의실 관리

### Low Priority (선택)
1. 공지사항 관리
2. 신고 관리
3. 고급 분석 기능
4. 엑셀 export 기능

---

## 📝 구현 시 주의사항

1. **권한 검증**: 모든 관리자 API는 반드시 adminAuth 미들웨어를 통과해야 함
2. **에러 처리**: try-catch로 모든 비동기 작업 감싸기
3. **사용자 경험**: 로딩 상태, 에러 메시지, 성공 토스트 표시
4. **데이터 일관성**: 삭제/변경 작업 시 관련 데이터 함께 처리
5. **페이지네이션**: 대용량 데이터는 반드시 페이지네이션 적용
6. **검색 최적화**: DB 인덱스 확인 및 쿼리 최적화
7. **캐싱**: 통계 데이터는 Redis 또는 메모리 캐싱 고려
8. **로깅**: 모든 관리자 액션은 로그로 기록

---

## 🚀 시작하기

1. Phase 1부터 순차적으로 구현
2. 각 Phase의 체크박스를 완료하면 체크 (- [ ] → - [x])
3. 구현 중 발견한 이슈는 이 문서에 기록
4. 완료된 기능은 테스트 후 다음 Phase로 진행

---

**작성일**: 2025-12-11
**최종 수정일**: 2025-12-12
**담당자**: 관리자 페이지 개발팀

---

## ✅ 구현 완료 요약 (2025-12-12)

### 핵심 기능 구현 완료

#### Phase 1: 기본 구조 및 사용자 관리 ✅ (100%)
- ✅ 관리자 대시보드 레이아웃 (사이드바, 통계 카드)
- ✅ 사용자 목록 테이블 (검색, 필터, 페이지네이션)
- ✅ 사용자 상세 모달 (수강/강의 내역 포함)
- ✅ 계정 상태 변경 기능
- ✅ 사용자 관리 API 전체

#### Phase 2: 강의 관리 ✅ (95%)
- ✅ 강의 목록 테이블 (상태별 필터, 검색, 정렬)
- ✅ 강의 상세 모달 (수강생, 결제 통계)
- ✅ 강의 상태 변경 (승인/거부/아카이브)
- ✅ 강의 강제 삭제
- ✅ 인기 강의 TOP 10 차트 (BarChart)
- ✅ 강의 관리 API 전체
- ⚠️ 카테고리별/월별 분포 차트 (향후 구현)

#### Phase 3: 수강 및 결제 관리 ✅ (98%)
- ✅ 수강 신청 목록 (상태 필터, **날짜 범위 필터**)
- ✅ 수강 강제 취소 기능
- ✅ 결제 내역 테이블 (**날짜 범위 필터, 상태 필터**)
- ✅ 환불 승인/거부
- ✅ **수동 환불 처리 모달**
- ✅ 매출 통계 (총 매출, 환불액, 순수익)
- ✅ 수강/결제 관리 API 전체
- ⚠️ 결제 상세 조회 API (향후 구현)

#### Phase 4: 강의실 관리 ✅ (100%)
- ✅ 강의실 목록 테이블 (이름, 설명, 수용인원, 사용 중인 강의 수, 상태)
- ✅ 강의실 추가/수정 모달
- ✅ 강의실 삭제 (비활성화)
- ✅ 사용 중인 강의 체크
- ✅ 강의실 관리 API 전체
- ✅ **시간표 슬롯 관리 (요일, 시작/종료 시간, 순서)**
- ⚠️ 강의실 이용률 통계 (향후 구현)

#### Phase 5: 통합 대시보드 ✅ (100%)
- ✅ 실시간 통계 카드 (사용자/강의/매출/오늘의 활동)
- ✅ **매출 추이 LineChart (일별/주별/월별 토글)**
- ✅ **인기 강의 TOP 10 BarChart**
- ✅ **최근 활동 로그 (가입/수강/결제 통합, 색상 코딩)**
- ✅ 통계 백엔드 API 전체

#### Phase 6: 권한 및 보안 ✅ (95%)
- ✅ requireAdmin 미들웨어
- ✅ AdminRoute 컴포넌트
- ✅ 403 에러 페이지
- ✅ 모든 admin API 권한 체크
- ✅ 민감한 작업 확인 다이얼로그
- ⚠️ 관리자 활동 로깅 시스템 (향후 구현)
- ⚠️ API Rate Limiting (향후 구현)

### 생성된 파일
#### 프론트엔드 (8개)
- `src/components/dashboard/AdminDashboard.jsx`
- `src/components/admin/UserManagement.jsx`
- `src/components/admin/CourseManagement.jsx`
- `src/components/admin/EnrollmentManagement.jsx`
- `src/components/admin/PaymentManagement.jsx`
- `src/components/admin/ClassroomManagement.jsx` ✨ NEW
- `src/components/AdminRoute.jsx`
- `src/pages/Forbidden.jsx`

#### 백엔드 (6개)
- `server/routes/admin/users.js`
- `server/routes/admin/courses.js`
- `server/routes/admin/enrollments.js`
- `server/routes/admin/payments.js`
- `server/routes/admin/classrooms.js` ✨ NEW
- `server/routes/admin/stats.js`

#### 문서 (2개)
- `docs/create_admin_account.sql`
- `docs/ADMIN_ACCOUNT_SETUP.md`

### 주요 기능 상세

#### 1. 사용자 관리
- 전체 사용자 목록 조회 (페이지네이션)
- 검색 기능 (이름/이메일)
- 역할별 필터 (student/instructor/admin)
- 계정 상태 변경 (활성/비활성)
- 사용자 상세 정보 모달 (수강/개설 강의 내역 포함)
- 사용자 통계 조회

#### 2. 강의 관리
- 전체 강의 목록 (모든 상태)
- 상태별 필터 (published/draft/archived)
- 검색 기능 (강의명, 강사명)
- 강의 승인/거부/아카이브
- 강의 강제 삭제 (수강생 체크 포함)
- 강의 상세 정보 모달 (수강생 목록, 결제 통계)
- 강의 통계 조회

#### 3. 수강 관리
- 전체 수강 신청 내역 조회
- 상태별 필터 (active/dropped)
- **날짜 범위 필터 (시작일~종료일)**
- 수강 강제 취소
- 수강 통계 (총 건수, 취소율)

#### 4. 결제 및 환불 관리
- 전체 결제 내역 조회 (페이지네이션)
- **결제 상태 필터 (DONE/PENDING/CANCELLED)**
- **날짜 범위 필터 (시작일~종료일)**
- 환불 요청 목록 조회
- 환불 승인/거부 처리
- **수동 환불 처리 (모달 UI, 관리자가 직접 환불 생성)**
- 매출 통계 (총 매출, 환불액, 순수익, 환불율)

#### 5. 통합 대시보드
- 실시간 통계 카드 (사용자, 강의, 매출, 오늘의 활동)
- **매출 추이 LineChart (일별/주별/월별 토글)**
- **인기 강의 TOP 10 수평 BarChart**
- **최근 활동 로그 (가입/수강/결제 통합, 타입별 색상 코딩)**
- 사이드바 네비게이션

#### 6. 권한 및 보안
- requireAdmin 미들웨어 (모든 admin API 보호)
- AdminRoute 컴포넌트 (프론트엔드 라우트 보호)
- 403 Forbidden 페이지
- 민감한 작업 확인 다이얼로그

#### 7. 강의실 및 시간표 관리
- 전체 강의실 목록 조회 (비활성 포함)
- 강의실 추가/수정 모달
- 강의실 삭제 (비활성화)
- 사용 중인 강의 수 표시
- 강의실 통계 (전체/사용중/비활성)
- 강의실별 상세 정보 (시간표, 강의 목록)
- **시간표 슬롯 CRUD (요일, 시작/종료 시간, 순서)**

### 향후 구현 예정
- 결제 상세 조회 API (`GET /api/admin/payments/:id`)
- 카테고리별 강의 분포 차트
- 월별 강의 개설 추이 그래프
- 강의실 이용률 통계 (요일별/시간대별)
- 관리자 활동 로깅 시스템
- API Rate Limiting

### 최근 구현 사항 (2025-12-16)

#### 🆕 Phase 4.2: 시간표 슬롯 관리
1. **시간표 슬롯 목록 테이블**
   - 요일, 시작 시간, 종료 시간, 순서 컬럼
   - 요일별 색상 코딩
   - 정렬 기능 (요일 → 순서 순)

2. **시간표 슬롯 추가/수정**
   - 요일 선택 (월~일)
   - 시작/종료 시간 입력 (time picker)
   - 순서 지정 (정수)
   - 폼 유효성 검사

3. **시간표 슬롯 삭제**
   - 확인 다이얼로그
   - 즉시 삭제 (실제 DB에서 삭제)

4. **강의실 통합 UI**
   - 강의실 테이블에 시간표 관리 버튼 추가 (Clock 아이콘)
   - 시간표 슬롯 모달 (z-index 50)
   - 슬롯 폼 모달 (z-index 60)

5. **백엔드 API** (이미 구현되어 있었음)
   - GET /api/admin/classrooms/:id/time-slots - 슬롯 목록
   - POST /api/admin/classrooms/:id/time-slots - 슬롯 생성
   - PUT /api/admin/classrooms/:classroomId/time-slots/:slotId - 슬롯 수정
   - DELETE /api/admin/classrooms/:classroomId/time-slots/:slotId - 슬롯 삭제

### 이전 구현 사항 (2025-12-12)

#### 🆕 Phase 3: 고급 필터 및 수동 환불 기능
1. **수강 관리 날짜 범위 필터**
   - 시작일/종료일 선택 가능
   - `enrolled_at` 기준 필터링
   - 날짜 초기화 버튼 추가

2. **결제 관리 고급 필터**
   - 결제 상태 필터 (DONE/PENDING/CANCELLED)
   - 날짜 범위 필터 (시작일~종료일)
   - 통합 필터 초기화 버튼

3. **수동 환불 처리 모달**
   - 환불 탭에 "수동 환불 처리" 버튼 추가
   - 사용자 ID, 강의 ID, 환불 금액 입력
   - 환불 사유 입력 (선택)
   - 즉시 'approved' 상태로 환불 생성

#### 🆕 Phase 5: 대시보드 차트 및 시각화
1. **매출 추이 LineChart**
   - 일별/주별/월별 토글 버튼
   - Recharts 기반 반응형 차트
   - 실제 데이터 그룹화 및 표시

2. **인기 강의 TOP 10 BarChart**
   - 수평 막대 차트로 직관적 표시
   - 수강생 수 기준 정렬
   - 강의 제목과 수강생 수 표시

3. **최근 활동 로그**
   - 가입/수강/결제 활동 통합
   - 타입별 색상 코딩 (초록/파랑/보라)
   - 최근 15건 시간순 정렬

#### 🆕 Phase 4: 강의실 관리 기능
1. **강의실 관리 페이지**
   - 강의실 목록 테이블 (이름, 설명, 수용인원, 사용 강의 수, 상태)
   - 통계 카드 (전체/사용중/비활성)
   - 실시간 강의 사용 현황 표시

2. **강의실 추가/수정**
   - 모달 UI로 강의실 생성
   - 이름, 설명, 수용인원 입력
   - 폼 유효성 검사

3. **강의실 삭제**
   - 사용 중인 강의 체크
   - 사용 중이면 삭제 불가 경고
   - 실제로는 status를 'inactive'로 변경

4. **강의실 관리 API**
   - GET /api/admin/classrooms - 전체 목록 (비활성 포함)
   - POST /api/admin/classrooms - 강의실 생성
   - PUT /api/admin/classrooms/:id - 강의실 수정
   - DELETE /api/admin/classrooms/:id - 강의실 삭제
   - GET /api/admin/classrooms/stats - 통계

### 테스트 방법
1. 관리자 계정 생성 (`docs/ADMIN_ACCOUNT_SETUP.md` 참조)
2. admin@test.com / test1234 로그인
3. `/dashboard` 접속 시 관리자 대시보드 자동 표시
4. 사이드바 메뉴로 각 기능 테스트

#### 새 기능 테스트
- **수강 관리**: 날짜 범위 필터로 특정 기간 수강 조회
- **결제 관리**: 상태/날짜 필터 조합, "수동 환불 처리" 버튼 클릭
- **대시보드**: 매출 추이 토글 버튼, 인기 강의 차트, 활동 로그 확인
- **강의실 관리**: "강의실 추가" 버튼, 수정/삭제 기능, 사용 중인 강의 체크
- **시간표 슬롯 관리**:
  1. 강의실 테이블에서 Clock 아이콘 클릭
  2. "시간표 슬롯 추가" 버튼으로 새 슬롯 생성
  3. 요일, 시작/종료 시간, 순서 입력
  4. 슬롯 수정/삭제 기능 테스트
