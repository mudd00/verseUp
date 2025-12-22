# VerseUp 이슈 및 개선 사항

> 1차 프로젝트 코드 리뷰 결과 및 2차 프로젝트에서 개선해야 할 사항

**최종 업데이트**: 2024-12-22

---

## 목차

1. [보안 이슈 (Critical)](#1-보안-이슈-critical)
2. [코드 품질 이슈 (Medium)](#2-코드-품질-이슈-medium)
3. [성능 이슈 (Medium)](#3-성능-이슈-medium)
4. [아키텍처 이슈 (Low-Medium)](#4-아키텍처-이슈-low-medium)
5. [미완성 기능](#5-미완성-기능)
6. [개선 권장 사항](#6-개선-권장-사항)

---

## 1. 보안 이슈 (Critical)

### 1.1 CORS 설정 - 모든 Origin 허용
**파일**: `server/server.js` (Line 40-47)
**심각도**: Critical

```javascript
// 현재 코드 - 모든 origin 허용 (위험!)
callback(null, true) // 개발 중에는 모든 origin 허용
```

**문제점**: 프로덕션에서도 모든 origin이 허용됨

**해결 방법**:
```javascript
if (process.env.NODE_ENV === 'production') {
  callback(new Error('Not allowed by CORS'))
} else {
  callback(null, true) // 개발에서만 허용
}
```

**상태**: [x] 해결됨 (2024-12-22)

---

### 1.2 URL 테스트 Role 파라미터 - 권한 상승 가능
**파일**: `src/components/metaverse/MetaverseScene.jsx` (Line 50-53)
**심각도**: Critical

```javascript
// 수정 후
const testRole = import.meta.env.DEV ? urlParams.get('role') : null
```

**상태**: [x] 해결됨 (2024-12-22)

---

### 1.3 결제 금액 검증 누락
**파일**: `server/routes/payments.js` (Line 19-20)
**심각도**: High

**문제점**:
- 금액 타입 검증 없음
- 원래 결제 기록과 금액 일치 여부 확인 없음
- 음수 금액 가능

**해결 방법**:
```javascript
// 금액 검증 추가
if (typeof amount !== 'number' || amount <= 0) {
  return res.status(400).json({ error: '잘못된 금액입니다.' })
}
// DB에서 원래 금액과 비교
const originalPayment = await getPaymentByOrderId(orderId)
if (originalPayment.amount !== amount) {
  return res.status(400).json({ error: '금액이 일치하지 않습니다.' })
}
```

**상태**: [ ] 미해결

---

### 1.4 강의 생성 입력 검증 부족
**파일**: `server/routes/courses.js` (Line 277)
**심각도**: Medium

**문제점**:
- maxStudents, price 검증 없음
- 문자열 최대 길이 제한 없음
- weeks가 음수이거나 비정상적으로 큰 값 가능

**해결 방법**: Zod 또는 Joi 스키마 검증 라이브러리 도입

**상태**: [ ] 미해결

---

## 2. 코드 품질 이슈 (Medium)

### 2.1 과도한 Console 로깅
**파일**: 다수 (60개 이상 파일)
**심각도**: Medium

**영향받는 주요 파일**:
- `src/hooks/useVoiceChat.js` (19개 console.log)
- `src/hooks/useScreenShare.js` (14개)
- `src/hooks/useScreenReceive.js` (15개)
- `src/components/metaverse/MetaverseScene.jsx` (다수)
- `server/routes/payments.js` (6개)

**해결 방법**:
```javascript
// utils/logger.js 생성
const logger = {
  debug: (...args) => {
    if (import.meta.env.DEV) console.log(...args)
  },
  error: (...args) => console.error(...args),
}
export default logger
```

**상태**: [ ] 미해결

---

### 2.2 코드 중복 - Role 추론 로직
**파일**: `src/App.jsx`
**심각도**: Medium

**해결**: `src/utils/roleUtils.js` 생성 및 중복 코드 제거

```javascript
// src/utils/roleUtils.js
export const inferRoleFromEmail = (email) => {
  if (!email) return 'student'
  if (email.includes('instructor@')) return 'instructor'
  if (email.includes('admin@')) return 'admin'
  return 'student'
}
```

**상태**: [x] 해결됨 (2024-12-22)

---

### 2.3 파일 업로드 크기 불일치
**파일**:
- `src/components/course/CourseMaterials.jsx`: 50MB
- `src/utils/constants.js`: 10MB

**해결 방법**: constants.js에서 통일된 값 사용

**상태**: [ ] 미해결

---

## 3. 성능 이슈 (Medium)

### 3.1 useEffect 클린업 누락 가능성
**파일**: `src/components/metaverse/MetaverseScene.jsx`
**심각도**: Medium

**문제점**: 일부 useEffect에서 socket 리스너 클린업이 누락될 수 있음

**검토 필요 위치**:
- Line 84-93 (VoiceChat Debug effect)
- Line 97-103 (screenReceive effect)

**해결 방법**: 모든 useEffect에 명시적 클린업 함수 추가

**상태**: [ ] 검토 필요

---

### 3.2 메모리 누수 가능성 - WebRTC Refs
**파일**: `src/hooks/useScreenShare.js` (Line 210-223)
**심각도**: Medium

**문제점**: `enabled=false`일 때 컴포넌트 언마운트 시 클린업이 실행되지 않을 수 있음

**해결 방법**:
```javascript
// 별도의 클린업 전용 useEffect 추가
useEffect(() => {
  return () => {
    // 항상 클린업
    streamRef.current?.getTracks().forEach(track => track.stop())
    peerConnectionsRef.current.forEach(pc => pc.close())
  }
}, [])
```

**상태**: [ ] 미해결

---

### 3.3 Socket 연결 경쟁 상태
**파일**: `src/services/socket.js` (Line 9-12)
**심각도**: Low

**문제점**: `connect()`가 빠르게 두 번 호출되면 두 개의 소켓이 생성될 수 있음

**해결 방법**: 연결 중 상태 플래그 추가

**상태**: [ ] 미해결

---

## 4. 아키텍처 이슈 (Low-Medium)

### 4.1 API 서비스 네이밍 불일치
**파일**: `src/services/api.js`

```javascript
export const apiService = new ApiService()
export const api = apiService
export default api
```

**문제점**: `apiService`, `api`, `default` 세 가지로 export되어 혼란

**해결 방법**: 하나로 통일

**상태**: [ ] 미해결

---

### 4.2 인증 미들웨어 패턴 불일치
**파일**: `server/routes/*.js`

**문제점**: 일부 라우트는 `authMiddleware` + `requireRole()`, 다른 곳은 `authMiddleware`만 사용

**해결 방법**: 라우트별 권한 요구사항 문서화 및 일관된 패턴 적용

**상태**: [ ] 미해결

---

### 4.3 3D 컴포넌트 Error Boundary 부족
**파일**: `src/pages/Metaverse.jsx`
**심각도**: Medium

**문제점**: Three.js/WebGL 에러는 일반 React Error Boundary로 잡히지 않을 수 있음

**해결 방법**: Three.js 전용 에러 핸들링 구현

**상태**: [ ] 미해결

---

## 5. 미완성 기능

### 5.1 TURN 서버 미설정
**파일**: `src/utils/constants.js` (Line 6-11)

```javascript
export const TURN_SERVER_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // TURN server configuration will be added later
  ],
}
```

**영향**: NAT 뒤의 사용자 간 WebRTC 연결 실패 가능

**상태**: [ ] 미구현

---

### 5.2 출석 체크 기능
**상태**: DB 스키마만 존재, UI/API 미구현

---

### 5.3 실시간 채팅
**상태**: 구조만 존재, 완전한 구현 필요

---

### 5.4 판서 UV 문제
**파일**: `src/components/metaverse/Blackboard.jsx`

**문제점**:
- 칠판 메시 UV 범위: U 25.7%, V 98.1%만 사용
- 위/아래 잘림, 비율 왜곡

**해결 방법**: Blender에서 칠판 메시 UV 리매핑 (0~1 전체 사용)

**상태**: [ ] 2차 프로젝트에서 해결 예정

---

## 6. 개선 권장 사항

### 즉시 해결 (보안)
- [ ] CORS 폴백을 프로덕션에서 거부하도록 변경
- [ ] URL `?role=` 파라미터 제거 또는 개발 환경으로 제한
- [ ] 결제 금액 검증 추가
- [ ] 입력 검증 라이브러리 (Zod/Joi) 도입

### 단기 (코드 품질)
- [ ] 조건부 로깅 시스템 구현
- [ ] 중복 코드 유틸리티로 추출
- [ ] useEffect 클린업 함수 점검
- [ ] API 서비스 네이밍 통일

### 중기 (아키텍처)
- [ ] 중앙 집중식 에러 핸들링 구현
- [ ] 요청/응답 로깅 미들웨어 추가
- [ ] 결제 플로우 통합 테스트 추가
- [ ] TURN 서버 설정

### 장기 (성능)
- [ ] 60개 이상 useEffect 메모리 누수 감사
- [ ] WebRTC 연결 모니터링 추가
- [ ] 3D 렌더링 최적화

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|-----------|--------|
| 2024-12-22 | 초기 이슈 목록 작성 | Claude |

