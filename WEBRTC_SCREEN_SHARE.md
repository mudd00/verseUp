# WebRTC 화면 공유 구현 완료

## 작업 일시
2025-12-05

## 구현 개요
3D 메쉬 대신 WebRTC + Socket.IO를 사용한 실시간 화면 공유 시스템 구현

---

## 구현 내용

### 1. Socket.IO 서버 (server/sockets/index.js)

**추가된 이벤트:**
- `screenshare:start` - 화면 공유 시작 알림
- `screenshare:stop` - 화면 공유 종료 알림
- `screenshare:offer` - WebRTC offer 전달 (강사 → 학생)
- `screenshare:answer` - WebRTC answer 전달 (학생 → 강사)
- `screenshare:ice-candidate` - ICE candidate 교환

**상태 관리:**
```javascript
const screenSharing = new Map() // roomId -> { teacherId, teacherSocketId, teacherName }
```

**자동 정리:**
- 사용자가 연결을 끊으면 화면 공유 자동 종료 및 다른 사용자에게 알림

---

### 2. 강사용 훅 (src/hooks/useScreenShare.js)

**기능:**
- `getDisplayMedia()`로 화면 캡처 (1920x1080, 30fps)
- 방의 각 학생마다 별도의 RTCPeerConnection 생성
- Offer 생성 및 전송
- Answer 및 ICE candidate 수신 처리
- 새 학생 입장 시 자동으로 offer 전송

**API:**
```javascript
const { isSharing, error, startSharing, stopSharing } = useScreenShare(roomId, students)
```

---

### 3. 학생용 훅 (src/hooks/useScreenReceive.js)

**기능:**
- 강사의 화면 공유 시작/종료 감지
- Offer 수신 시 자동으로 RTCPeerConnection 생성
- Answer 생성 및 전송
- 스트림 수신 및 상태 관리

**API:**
```javascript
const { teacherStream, isReceiving, teacherInfo } = useScreenReceive(roomId)
```

---

### 4. UI 컴포넌트 (src/components/metaverse/ScreenShareOverlay.jsx)

**기능:**
- 비디오 스트림을 HTML `<video>` 요소로 표시
- 최소화/복원 기능
- 전체화면 기능
- 드래그 가능 (미구현)
- 강사 이름 표시
- 라이브 표시 (빨간 점 애니메이션)

**UI 위치:**
- 기본: 우측 상단 (600x400)
- 최소화: 우측 하단 (264x140)

---

### 5. MetaverseScene 통합

**역할 기반 기능:**

#### 강사 (instructor)
1. 교탁에 서면 "화면 공유 시작/종료" 버튼 표시
2. 버튼 클릭 시 화면 캡처 → WebRTC 연결 → 학생들에게 스트림 전송
3. 에러 발생 시 에러 메시지 표시

#### 학생 (student)
1. 강사가 화면 공유를 시작하면 자동으로 연결
2. 우측에 비디오 오버레이 자동 표시
3. 최소화/복원/전체화면 가능
4. 강사가 종료하면 자동으로 오버레이 닫힘

**방 관리:**
- 학교 맵에 입장하면 자동으로 `metaverse-classroom-1` 방에 참가
- Socket.IO로 방 사용자 목록 동기화
- 사용자 입장/퇴장 실시간 감지

---

## 작동 흐름

```
1. 강사와 학생들이 메타버스(학교 맵)에 입장
   ↓
2. Socket.IO 방 자동 참가 (metaverse-classroom-1)
   ↓
3. 강사가 교탁에 서기 (F키)
   ↓
4. "화면 공유 시작" 버튼 클릭
   ↓
5. getDisplayMedia()로 화면 선택
   ↓
6. 서버에 screenshare:start 이벤트 전송
   ↓
7. 서버가 모든 학생들에게 screenshare:started 브로드캐스트
   ↓
8. 강사가 각 학생에게 WebRTC offer 전송
   ↓
9. 학생들이 자동으로 answer 생성 및 전송
   ↓
10. ICE candidate 교환
   ↓
11. P2P 연결 확립
   ↓
12. 학생 화면에 비디오 스트림 표시
```

---

## 기술 스택

- **WebRTC**: 실시간 미디어 스트리밍
- **Socket.IO**: 시그널링 및 이벤트 브로드캐스트
- **React Hooks**: 상태 관리 및 로직 재사용
- **STUN Server**: Google Public STUN (NAT 통과)

---

## STUN 서버

```javascript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}
```

> 프로덕션 환경에서는 TURN 서버 추가 권장 (방화벽/NAT 통과 보장)

---

## 테스트 방법

### 1. 서버 실행
```bash
npm run dev:both
```

### 2. 강사 계정으로 로그인
- 이메일: `instructor@example.com`
- 또는 user.role === 'instructor'

### 3. 학생 계정으로 로그인 (다른 브라우저/시크릿 창)
- 다른 이메일

### 4. 둘 다 메타버스 입장 → 학교 맵 이동

### 5. 강사: 교탁에 서기 (F) → 화면 공유 시작 클릭

### 6. 학생: 자동으로 비디오 오버레이 표시 확인

---

## 주요 파일

### 백엔드
- `server/sockets/index.js` - Socket.IO 이벤트 핸들러

### 프론트엔드
- `src/hooks/useScreenShare.js` - 강사용 화면 공유 훅
- `src/hooks/useScreenReceive.js` - 학생용 스트림 수신 훅
- `src/components/metaverse/ScreenShareOverlay.jsx` - 비디오 UI
- `src/components/metaverse/MetaverseScene.jsx` - 통합 및 방 관리

---

## 제거된 코드

### 3D Screen 컴포넌트
- ❌ `src/components/metaverse/Screen.jsx` (삭제하지 않았지만 사용 안 함)
- ❌ MapModel의 VERDE_GRANDE 감지 로직 제거
- ❌ screenPosition 상태 및 관련 콜백 제거
- ❌ Three.js VideoTexture 방식 제거

---

## 개선 가능 사항

### 1. TURN 서버 추가
```javascript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ]
}
```

### 2. 오디오 공유
```javascript
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true  // 시스템 오디오 포함
})
```

### 3. 화질 선택
- 저화질/고화질 옵션
- 대역폭에 따른 자동 조절

### 4. 녹화 기능
- MediaRecorder API 사용
- 강의 다시보기

### 5. 다중 교실 지원
- roomId를 교실마다 다르게 설정
- 여러 강사가 동시에 다른 교실에서 화면 공유

### 6. 채팅 통합
- 화면 공유 중 실시간 채팅
- Q&A 기능

### 7. 권한 관리
- 학생이 화면 공유 요청
- 강사 승인 후 공유

---

## 알려진 제한사항

1. **브라우저 지원**
   - Chrome, Edge, Firefox 지원
   - Safari는 제한적 지원

2. **동시 연결 수**
   - P2P 방식이므로 학생 수가 많으면 강사 부하 증가
   - SFU(Selective Forwarding Unit) 고려

3. **방화벽/NAT**
   - STUN만으로는 일부 네트워크에서 연결 실패 가능
   - TURN 서버 필요

4. **모바일 지원**
   - getDisplayMedia()는 모바일에서 제한적

---

## 디버깅 팁

### 콘솔 로그 확인
```
📺 Screen sharing started  # 강사가 공유 시작
📺 Offer sent to student {socketId}  # Offer 전송
📺 Answer received from {socketId}  # Answer 수신
📺 Connection state with {socketId}: connected  # 연결 성공
📺 Received track from teacher  # 학생이 스트림 수신
```

### 연결 실패 시
1. 콘솔에서 ICE connection state 확인
2. STUN 서버 응답 확인
3. 방화벽/보안 프로그램 확인
4. 두 사용자가 같은 방에 있는지 확인

---

## 보안 고려사항

1. **HTTPS 필수**
   - getDisplayMedia()는 HTTPS에서만 작동
   - localhost는 예외

2. **권한 검증**
   - 강사만 화면 공유 가능하도록 서버에서 검증
   - 현재는 클라이언트 측 role 체크만 있음

3. **방 접근 제어**
   - 인증된 사용자만 방 참가
   - 방 비밀번호 또는 초대 시스템

---

## 성능 최적화

1. **비디오 품질**
   - 현재: 1920x1080 @ 30fps
   - 학생 수에 따라 동적 조절 가능

2. **연결 타임아웃**
   - ICE gathering timeout 설정
   - 연결 실패 시 재시도 로직

3. **리소스 정리**
   - 컴포넌트 언마운트 시 자동 정리
   - 스트림 및 PeerConnection 정리

---

## 결과

✅ 3D 메쉬 방식 제거
✅ WebRTC P2P 실시간 화면 공유 구현
✅ 강사/학생 역할 기반 기능 분리
✅ 자동 연결 및 정리
✅ 직관적인 UI
✅ 안정적인 연결 관리

**이제 강사가 교탁에 서서 화면 공유를 시작하면, 같은 교실에 있는 모든 학생의 화면에 실시간으로 강사의 화면이 표시됩니다!** 🎉
