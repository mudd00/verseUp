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
- 강의 승인/거부 (draft → published 심사)
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

### **Phase 1: 기본 구조 및 사용자 관리**

#### 1.1 관리자 대시보드 레이아웃 구성
- [ ] `src/components/dashboard/AdminDashboard.jsx` 컴포넌트 생성
- [ ] 사이드바 네비게이션 컴포넌트 구현
  - [ ] 메뉴 항목: 대시보드, 사용자, 강의, 수강, 결제, 강의실, 설정
  - [ ] 현재 활성 메뉴 하이라이트
- [ ] 통계 카드 레이아웃 구현
  - [ ] 총 사용자 수
  - [ ] 총 강의 수
  - [ ] 총 매출
  - [ ] 오늘의 활동 (가입, 수강 신청)
- [ ] `src/pages/Dashboard.jsx` 수정 - admin 역할일 때 AdminDashboard 렌더링

#### 1.2 사용자 관리 페이지
- [ ] `src/components/admin/UserManagement.jsx` 컴포넌트 생성
- [ ] 사용자 목록 테이블 구현
  - [ ] 컬럼: 이름, 이메일, 역할, 가입일, 상태
  - [ ] 검색 기능 (이름/이메일)
  - [ ] 역할별 필터 (전체/학생/강사/관리자)
  - [ ] 페이지네이션
- [ ] 사용자 상세 정보 모달
  - [ ] 기본 정보 (이름, 이메일, 프로필 이미지)
  - [ ] 수강 내역 (학생인 경우)
  - [ ] 개설 강의 내역 (강사인 경우)
- [ ] 역할 변경 기능
  - [ ] 드롭다운 선택 UI
  - [ ] 확인 모달
  - [ ] API 호출 및 상태 업데이트
- [ ] 계정 상태 변경 토글
  - [ ] 활성화/비활성화 스위치
  - [ ] 확인 다이얼로그

#### 1.3 사용자 관리 백엔드 API
- [ ] `server/middleware/adminAuth.js` 미들웨어 생성
  - [ ] admin 역할 검증
  - [ ] 권한 없을 시 403 에러 반환
- [ ] `server/routes/admin/users.js` 라우트 생성
  - [ ] `GET /api/admin/users` - 전체 사용자 목록
    - [ ] 쿼리 파라미터: page, limit, search, role
    - [ ] 페이지네이션 처리
  - [ ] `GET /api/admin/users/:id` - 사용자 상세
  - [ ] `PUT /api/admin/users/:id/role` - 역할 변경
  - [ ] `PUT /api/admin/users/:id/status` - 계정 상태 변경
  - [ ] `GET /api/admin/users/stats` - 사용자 통계
- [ ] `server/routes/index.js`에 admin 라우트 등록

---

### **Phase 2: 강의 관리**

#### 2.1 강의 관리 페이지
- [ ] `src/components/admin/CourseManagement.jsx` 컴포넌트 생성
- [ ] 강의 목록 테이블 구현
  - [ ] 컬럼: 제목, 강사, 카테고리, 수강인원/정원, 상태, 생성일
  - [ ] 상태별 필터 (전체/published/draft/archived)
  - [ ] 검색 기능 (강의명, 강사명)
  - [ ] 정렬 기능
- [ ] 강의 상세 정보 모달
  - [ ] 강의 기본 정보
  - [ ] 수강생 목록
  - [ ] 결제 통계
- [ ] 강의 상태 변경 기능
  - [ ] 승인/거부/아카이브 버튼
  - [ ] 거부 시 사유 입력 모달
- [ ] 강의 강제 삭제 기능
  - [ ] 경고 모달
  - [ ] 수강생 있을 경우 추가 확인

#### 2.2 강의 통계 차트
- [ ] Chart 라이브러리 설치 (Recharts)
- [ ] 카테고리별 강의 분포 차트
- [ ] 월별 강의 개설 추이 그래프
- [ ] 인기 강의 TOP 10 리스트

#### 2.3 강의 관리 백엔드 API
- [ ] `server/routes/admin/courses.js` 라우트 생성
  - [ ] `GET /api/admin/courses` - 전체 강의 목록 (상태 무관)
    - [ ] 쿼리 파라미터: page, limit, search, status
  - [ ] `GET /api/admin/courses/:id` - 강의 상세 (수강생 포함)
  - [ ] `PUT /api/admin/courses/:id/status` - 강의 상태 변경
  - [ ] `DELETE /api/admin/courses/:id` - 강의 강제 삭제
  - [ ] `GET /api/admin/courses/stats` - 강의 통계

---

### **Phase 3: 수강 및 결제 관리**

#### 3.1 수강 관리 페이지
- [ ] `src/components/admin/EnrollmentManagement.jsx` 컴포넌트 생성
- [ ] 수강 신청 목록 테이블
  - [ ] 컬럼: 학생명, 강의명, 수강일, 상태, 결제 여부
  - [ ] 상태별 필터 (active/dropped)
  - [ ] 날짜 범위 필터
- [ ] 수강 취소 기능
  - [ ] 강제 취소 버튼
  - [ ] 환불 처리 옵션
- [ ] 수강 통계
  - [ ] 총 수강 건수
  - [ ] 취소율
  - [ ] 강의별 수강 현황

#### 3.2 결제 및 환불 관리 페이지
- [ ] `src/components/admin/PaymentManagement.jsx` 컴포넌트 생성
- [ ] 결제 내역 테이블
  - [ ] 컬럼: 주문번호, 사용자, 강의, 금액, 결제일, 상태
  - [ ] 날짜 범위 필터
  - [ ] 결제 상태 필터
- [ ] 환불 관리 섹션
  - [ ] 환불 요청 목록
  - [ ] 승인/거부 버튼
  - [ ] 수동 환불 처리 폼
- [ ] 매출 통계 및 차트
  - [ ] 일별/월별 매출 그래프
  - [ ] 총 매출, 환불액, 순수익 표시

#### 3.3 결제/환불 관리 백엔드 API
- [ ] `server/routes/admin/payments.js` 라우트 생성
  - [ ] `GET /api/admin/payments` - 전체 결제 내역
  - [ ] `GET /api/admin/payments/:id` - 결제 상세
  - [ ] `GET /api/admin/refunds` - 전체 환불 내역
  - [ ] `POST /api/admin/refunds/:id/approve` - 환불 승인
  - [ ] `POST /api/admin/refunds/:id/reject` - 환불 거부
  - [ ] `POST /api/admin/refunds/manual` - 수동 환불 처리
  - [ ] `GET /api/admin/payments/stats` - 결제/환불 통계
- [ ] `server/routes/admin/enrollments.js` 라우트 생성
  - [ ] `GET /api/admin/enrollments` - 전체 수강 내역
  - [ ] `DELETE /api/admin/enrollments/:id` - 수강 강제 취소
  - [ ] `GET /api/admin/enrollments/stats` - 수강 통계

---

### **Phase 4: 강의실 및 시간표 관리**

#### 4.1 강의실 관리 페이지
- [ ] `src/components/admin/ClassroomManagement.jsx` 컴포넌트 생성
- [ ] 강의실 목록 테이블
  - [ ] 컬럼: 이름, 설명, 수용인원, 이용 중인 강의 수
  - [ ] 추가 버튼
- [ ] 강의실 추가/수정 모달
  - [ ] 폼: 이름, 설명, 수용인원
  - [ ] 유효성 검사
- [ ] 강의실 삭제 기능
  - [ ] 사용 중인 강의 확인
  - [ ] 경고 모달

#### 4.2 시간표 슬롯 관리
- [ ] 시간표 슬롯 목록 테이블
  - [ ] 컬럼: 요일, 시작시간, 종료시간, 순서
- [ ] 시간표 슬롯 추가/수정/삭제 기능
- [ ] 강의실 이용률 통계
  - [ ] 요일별 이용률
  - [ ] 시간대별 이용률

#### 4.3 강의실 관리 백엔드 API
- [ ] `server/routes/admin/classrooms.js` 라우트 확장
  - [ ] `GET /api/admin/classrooms` - 전체 강의실 목록
  - [ ] `POST /api/admin/classrooms` - 강의실 추가
  - [ ] `PUT /api/admin/classrooms/:id` - 강의실 수정
  - [ ] `DELETE /api/admin/classrooms/:id` - 강의실 삭제
  - [ ] `GET /api/admin/classrooms/stats` - 이용률 통계

---

### **Phase 5: 통합 대시보드 및 통계**

#### 5.1 통계 대시보드
- [ ] 실시간 통계 카드 구현
  - [ ] 오늘의 가입자 수
  - [ ] 오늘의 수강 신청
  - [ ] 오늘의 결제 건수 및 금액
  - [ ] 전체 사용자/강의/매출 요약
- [ ] 매출 추이 그래프
  - [ ] 일별/주별/월별 전환 가능
  - [ ] Recharts LineChart 사용
- [ ] 인기 강의 TOP 10
  - [ ] 수강생 수 기준 정렬
  - [ ] 강의 정보 및 링크
- [ ] 최근 활동 로그
  - [ ] 실시간 활동 피드 (가입, 수강, 결제)
  - [ ] 최근 10건 표시

#### 5.2 통계 백엔드 API
- [ ] `server/routes/admin/stats.js` 라우트 생성
  - [ ] `GET /api/admin/stats/overview` - 전체 통계 요약
  - [ ] `GET /api/admin/stats/revenue` - 매출 추이
    - [ ] 쿼리 파라미터: period (daily/weekly/monthly)
  - [ ] `GET /api/admin/stats/popular-courses` - 인기 강의 TOP 10
  - [ ] `GET /api/admin/stats/activities` - 최근 활동 로그
  - [ ] `GET /api/admin/stats/real-time` - 실시간 통계

---

### **Phase 6: 권한 및 보안 강화**

#### 6.1 관리자 권한 체크 미들웨어
- [ ] `server/middleware/adminAuth.js` 강화
  - [ ] role === 'admin' 검증
  - [ ] 403 에러 응답
  - [ ] 로깅 (관리자 액션 추적)

#### 6.2 프론트엔드 권한 라우트 보호
- [ ] `src/components/AdminRoute.jsx` 컴포넌트 생성
  - [ ] admin role 체크
  - [ ] 권한 없을 시 403 페이지로 리다이렉트
- [ ] `src/pages/Forbidden.jsx` 생성 (403 에러 페이지)
- [ ] `src/App.jsx`에 Admin 전용 라우트 추가
  - [ ] `/admin/users` - 사용자 관리
  - [ ] `/admin/courses` - 강의 관리
  - [ ] `/admin/enrollments` - 수강 관리
  - [ ] `/admin/payments` - 결제 관리
  - [ ] `/admin/classrooms` - 강의실 관리

#### 6.3 보안 강화
- [ ] API rate limiting 설정 (express-rate-limit)
- [ ] 모든 admin API에 adminAuth 미들웨어 적용
- [ ] 민감한 작업 (삭제, 환불 등)에 추가 확인 단계
- [ ] 관리자 활동 로깅 (DB 테이블 생성)

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
**최종 수정일**: 2025-12-11
**담당자**: 관리자 페이지 개발팀
