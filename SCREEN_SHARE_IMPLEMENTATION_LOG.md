# 화면 공유 기능 구현 및 버그 수정 로그

## 📅 작업 일시
2025-12-05

## 🎯 목표
3D 메타버스 환경에서 강사가 학생들에게 실시간으로 화면을 공유할 수 있는 기능 구현

---

## 📋 작업 개요

### 초기 상황
- 3D 메쉬 기반 화면 공유 방식에서 WebRTC 기반으로 전환 필요
- 로그인 없이 테스트 가능하도록 개선 필요
- 멀티플레이어 캐릭터 렌더링은 미구현 상태

### 최종 결과
- ✅ WebRTC P2P 기반 실시간 화면 공유 구현
- ✅ 로그인 없이 URL 파라미터로 역할 테스트 가능
- ✅ Socket.IO 기반 시그널링 및 방 관리
- ✅ 디버그 패널로 상태 실시간 확인
- ✅ 자동 연결 및 정리 시스템

---

## 🏗️ 구현된 아키텍처

### 1. 서버 사이드 (Socket.IO)

**파일**: `server/sockets/index.js`

**주요 기능**:
- 방 관리 시스템 (room join/leave)
- 사용자 관리 (user join/leave)
- WebRTC 시그널링 (offer/answer/ICE candidate 중계)
- 화면 공유 상태 관리

**주요 이벤트**:
```javascript
// 사용자 관리
socket.on('user:join', ...)        // 사용자 입장
socket.on('room:join', ...)        // 방 참가
socket.on('room:leave', ...)       // 방 퇴장

// 화면 공유
socket.on('screenshare:start', ...) // 공유 시작
socket.on('screenshare:stop', ...)  // 공유 종료
socket.on('screenshare:offer', ...) // WebRTC offer 중계
socket.on('screenshare:answer', ...) // WebRTC answer 중계
socket.on('screenshare:ice-candidate', ...) // ICE candidate 중계
```

**중요 수정사항**:
- 디버깅 로그 추가 (방 멤버 수, 브로드캐스트 확인)
- 자동 정리 시스템 (연결 해제 시 화면 공유 자동 종료)

### 2. 클라이언트 사이드

#### 2.1. Socket 서비스

**파일**: `src/services/socket.js`

**주요 기능**:
- Socket.IO 연결 관리
- 이벤트 emit/on/off 래퍼

**중요 수정사항**:
```javascript
// ✅ off 메서드 수정 - 특정 핸들러만 제거하도록 개선
off(event, callback) {
  if (this.socket) {
    if (callback) {
      this.socket.off(event, callback) // 특정 핸들러만 제거
    } else {
      this.socket.off(event) // 모든 핸들러 제거
    }
  }
}

// ✅ 디버깅 로그 추가 - screenshare 이벤트 자동 로깅
this.socket.onAny((eventName, ...args) => {
  if (eventName.startsWith('screenshare:')) {
    console.log(`🔔 [SOCKET EVENT] ${eventName}:`, ...args)
  }
})
```

#### 2.2. 강사용 화면 공유 훅

**파일**: `src/hooks/useScreenShare.js`

**주요 기능**:
- `getDisplayMedia()`로 화면 캡처
- 각 학생마다 별도의 RTCPeerConnection 생성
- WebRTC offer 생성 및 전송
- Answer 및 ICE candidate 수신 처리

**API**:
```javascript
const { isSharing, error, startSharing, stopSharing } = useScreenShare(roomId, students, enabled)
```

**파라미터**:
- `roomId`: 현재 방 ID
- `students`: 학생 목록 배열 `[{ socketId, user }, ...]`
- `enabled`: 훅 활성화 여부 (강사일 때만 `true`)

**주요 수정사항**:
```javascript
// ✅ enabled 체크 추가 - startSharing, stopSharing 함수 내부
const startSharing = useCallback(async () => {
  if (!enabled) return // 비활성화 상태면 아무것도 안 함
  // ...
}, [enabled, roomId, students, sendOfferToStudent])

// ✅ cleanup effect 수정 - stopSharing 호출 대신 직접 정리
useEffect(() => {
  if (!enabled) return
  return () => {
    // stopSharing()을 호출하지 않고 직접 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
  }
}, [enabled]) // stopSharing을 dependency에서 제거

// ✅ socketService.off()에 핸들러 전달
return () => socketService.off('screenshare:answer', handleAnswer)
```

**화면 캡처 설정**:
```javascript
video: {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30 },
}
```

#### 2.3. 학생용 화면 수신 훅

**파일**: `src/hooks/useScreenReceive.js`

**주요 기능**:
- `screenshare:started` 이벤트 수신
- WebRTC offer 수신 시 자동 peer connection 생성
- Answer 생성 및 전송
- 스트림 수신 및 상태 관리

**API**:
```javascript
const { teacherStream, isReceiving, teacherInfo } = useScreenReceive(roomId, enabled)
```

**파라미터**:
- `roomId`: 현재 방 ID
- `enabled`: 훅 활성화 여부 (학생일 때만 `true`)

**반환값**:
- `teacherStream`: MediaStream 객체 (비디오 스트림)
- `isReceiving`: 스트림 수신 중인지 (boolean)
- `teacherInfo`: 강사 정보 `{ teacherId, teacherSocketId, teacherName }`

**주요 수정사항**:
```javascript
// ✅ 디버깅 로그 추가
console.log('👂 Listening for screenshare:started events...')
console.log(`📺 🎉 RECEIVED screenshare:started from ${teacherName}`)

// ✅ cleanup effect 수정
useEffect(() => {
  if (!enabled) return
  return () => {
    // cleanup 함수 호출 대신 직접 정리
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
  }
}, [enabled]) // cleanup을 dependency에서 제거

// ✅ socketService.off()에 핸들러 전달
return () => socketService.off('screenshare:started', handleScreenShareStarted)
```

#### 2.4. 비디오 오버레이 UI

**파일**: `src/components/metaverse/ScreenShareOverlay.jsx`

**주요 기능**:
- 비디오 스트림을 HTML `<video>` 요소로 표시
- 최소화/복원 기능
- 전체화면 기능
- 닫기 기능

**Props**:
```javascript
<ScreenShareOverlay
  stream={teacherStream}      // MediaStream 객체
  teacherName="강사 이름"      // 표시할 강사 이름
  onClose={() => {...}}        // 닫기 콜백
/>
```

**UI 위치**:
- 기본: 우측 상단 (600x400)
- 최소화: 우측 하단 (264x140)

#### 2.5. 메인 씬 통합

**파일**: `src/components/metaverse/MetaverseScene.jsx`

**주요 기능**:
- 역할 기반 기능 분기 (강사/학생)
- Socket.IO 방 참가 관리
- 화면 공유 상태 관리
- 디버그 패널 표시

**중요 수정사항**:

##### 테스트용 임시 사용자 생성
```javascript
// ✅ URL 파라미터로 역할 지정 가능
const testRole = urlParams.get('role') // ?role=instructor 또는 ?role=student

// ✅ useMemo로 안정적인 effectiveUser 생성
const effectiveUser = useMemo(() => {
  if (user) return user
  if (testRole) {
    return {
      id: `test-${testRole}-${Date.now()}`,
      name: testRole === 'instructor' ? '테스트 강사' : '테스트 학생',
      email: `test-${testRole}@test.com`,
      role: testRole,
    }
  }
  return null
}, [user, testRole])
```

##### 역할 기반 훅 사용
```javascript
// ✅ 항상 두 훅 모두 호출 (Rules of Hooks 준수)
// enabled 파라미터로 활성화 제어
const screenShare = useScreenShare(roomId, students, isInstructor)
const screenReceive = useScreenReceive(roomId, !isInstructor)
```

##### Socket 연결 초기화
```javascript
// ✅ 컴포넌트 마운트 시 소켓 연결
useEffect(() => {
  socketService.connect(null) // 토큰 없이도 연결 가능
  console.log('🔌 Initializing socket connection...')
}, [])
```

##### 방 참가 로직
```javascript
useEffect(() => {
  if (effectiveUser && currentMap === 'school') {
    console.log('🚪 Joining room:', roomId, 'as', effectiveUser.name)

    socketService.emit('user:join', { user: effectiveUser })
    socketService.emit('room:join', { roomId })

    socketService.on('room:users', handleRoomUsers)
    socketService.on('room:user-joined', handleUserJoined)
    socketService.on('room:user-left', handleUserLeft)

    return () => {
      // ✅ 핸들러 전달하여 특정 핸들러만 제거
      socketService.off('room:users', handleRoomUsers)
      socketService.off('room:user-joined', handleUserJoined)
      socketService.off('room:user-left', handleUserLeft)
      socketService.emit('room:leave', { roomId })
    }
  }
}, [effectiveUser, currentMap, roomId])
```

##### 버튼 표시 조건
```javascript
// ✅ teacherInfo가 설정되면 즉시 버튼 표시 (isReceiving 대신)
{!isInstructor && screenReceive?.teacherInfo && !isViewingScreen && (
  <button onClick={() => setIsViewingScreen(true)}>
    📺 {screenReceive.teacherInfo?.teacherName || '강사'}님의 화면 보기
  </button>
)}
```

##### 비디오 오버레이 조건
```javascript
// ✅ teacherStream이 있으면 오버레이 표시
{!isInstructor && screenReceive?.teacherStream && isViewingScreen && (
  <ScreenShareOverlay
    stream={screenReceive.teacherStream}
    teacherName={screenReceive.teacherInfo?.teacherName || '강사'}
    onClose={() => setIsViewingScreen(false)}
  />
)}
```

##### 디버그 패널
```javascript
// ✅ 실시간 상태 확인 가능 (좌측 상단)
<div>Debug Info</div>
<div>X, Y, Z 위치</div>
<div>사용자 이름 및 역할</div>

<div>Status:</div>
<div>Map: {currentMap}</div>
<div>Sitting: {isSitting ? '✅' : '❌'}</div>
<div>At Desk: {isAtDesk ? '✅' : '❌'}</div>

{isInstructor && (
  <div>Sharing: {screenShare?.isSharing ? '✅' : '❌'}</div>
)}

{!isInstructor && (
  <>
    <div>Teacher Sharing: {screenReceive?.teacherInfo ? '✅' : '❌'}</div>
    <div>Stream Received: {screenReceive?.teacherStream ? '✅' : '❌'}</div>
  </>
)}

<div>Room Users ({students.length + 1}):</div>
<div>• {effectiveUser?.name} (me)</div>
{students.map(s => <div>• {s.user?.name}</div>)}
```

---

## 🐛 해결한 주요 버그들

### 버그 1: Rules of Hooks 위반
**증상**: 조건부 훅 호출로 인한 에러
```javascript
// ❌ 잘못된 코드
const screenShare = isInstructor ? useScreenShare(...) : null
```

**해결**:
```javascript
// ✅ 올바른 코드 - 항상 호출, enabled로 제어
const screenShare = useScreenShare(roomId, students, isInstructor)
```

### 버그 2: Cleanup Function 무한 루프
**증상**: `stopSharing`이 dependency에 있어서 `isSharing` 변경 시 cleanup 실행 → 즉시 중지

**해결**:
```javascript
// ❌ 잘못된 코드
useEffect(() => {
  return () => {
    stopSharing()
  }
}, [enabled, stopSharing]) // stopSharing이 변경되면 cleanup 실행!

// ✅ 올바른 코드
useEffect(() => {
  return () => {
    // 직접 정리 (stopSharing 호출 안 함)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()
  }
}, [enabled]) // stopSharing 제거
```

### 버그 3: 이벤트 핸들러가 모두 제거되는 문제
**증상**:
- 소켓은 이벤트를 받지만 (`🔔 [SOCKET EVENT]` 로그 출력)
- 훅의 핸들러는 실행 안 됨 (`📺 🎉 RECEIVED` 로그 없음)
- 버튼이 나타나지 않음

**원인**: `socketService.off(event)`가 해당 이벤트의 **모든 핸들러**를 제거

**해결**:
```javascript
// ❌ 잘못된 코드
socketService.off('screenshare:started') // 모든 핸들러 제거!

// ✅ 올바른 코드
socketService.off('screenshare:started', handleScreenShareStarted) // 특정 핸들러만 제거
```

**적용 위치**:
- `src/services/socket.js` - off 메서드 수정
- `src/hooks/useScreenShare.js` - 모든 off 호출에 핸들러 전달
- `src/hooks/useScreenReceive.js` - 모든 off 호출에 핸들러 전달
- `src/components/metaverse/MetaverseScene.jsx` - room 이벤트 off 호출에 핸들러 전달

### 버그 4: 로그인 없이 테스트 불가
**증상**: `user`가 `null`이면 방에 참가하지 못함

**해결**: 테스트용 임시 사용자 자동 생성
```javascript
const effectiveUser = useMemo(() => {
  if (user) return user
  if (testRole) {
    return {
      id: `test-${testRole}-${Date.now()}`,
      name: testRole === 'instructor' ? '테스트 강사' : '테스트 학생',
      email: `test-${testRole}@test.com`,
      role: testRole,
    }
  }
  return null
}, [user, testRole])
```

---

## 🧪 테스트 방법

### 1. 서버 실행
```bash
npm run dev:both
```

### 2. 강사 창 열기 (일반 브라우저)
```
http://localhost:5173/metaverse?role=instructor
```

### 3. 학생 창 열기 (시크릿 창, Ctrl+Shift+N)
```
http://localhost:5173/metaverse?role=student
```

### 4. 양쪽 모두 학교 맵 입장
- 포탈 근처로 이동 (WASD)
- F키로 포탈 입장

### 5. 디버그 패널 확인 (좌측 상단)
**양쪽 모두 확인**:
```
Room Users (2):
• 테스트 강사 (me) 또는 테스트 학생 (me)
• 상대방 이름
```

### 6. 강사: 화면 공유 시작
1. 교탁으로 이동 (X: -52.17, Z: -28.20 근처)
2. F키로 교탁에 서기
3. 디버그 패널 확인: `At Desk: ✅`
4. 우측 상단 "화면 공유 시작" 버튼 클릭
5. 브라우저 팝업에서 공유할 화면/탭 선택
6. 디버그 패널 확인: `Sharing: ✅`

### 7. 학생: 화면 보기
1. 디버그 패널 확인: `Teacher Sharing: ✅`
2. 우측 상단 "화면 보기" 버튼 클릭
3. 비디오 오버레이 표시 확인
4. 디버그 패널 확인: `Stream Received: ✅`

### 예상 콘솔 로그

**강사 콘솔**:
```
🚪 Joining room: metaverse-classroom-1 as 테스트 강사
📚 Room users: 2 total - ['테스트 강사', '테스트 학생']
🎬 handleScreenShareToggle called { studentsCount: 1 }
▶️ Starting screen share...
🎬 Starting screen share... { roomId: 'metaverse-classroom-1', studentsCount: 1 }
✅ Screen captured successfully
📤 Emitting screenshare:start to room: metaverse-classroom-1
📺 Screen sharing started
📺 Offer sent to student {socketId}
📺 Answer received from {socketId}
📺 Connection state with {socketId}: connected
```

**학생 콘솔**:
```
🚪 Joining room: metaverse-classroom-1 as 테스트 학생
📚 Room users: 2 total - ['테스트 강사', '테스트 학생']
👂 Listening for screenshare:started events...
🔔 [SOCKET EVENT] screenshare:started: {...}
📺 🎉 RECEIVED screenshare:started from 테스트 강사
🔔 [SOCKET EVENT] screenshare:offer: {...}
📺 Received offer from teacher {socketId}
📺 Answer sent to teacher {socketId}
🔔 [SOCKET EVENT] screenshare:ice-candidate: {...}
📺 Connection state with teacher: connected
📺 Received track from teacher
```

**서버 터미널**:
```
✅ Client connected: {socketId1}
👤 User joined: 테스트 강사 ({socketId1})
🚪 User 테스트 강사 joined room: metaverse-classroom-1
✅ Client connected: {socketId2}
👤 User joined: 테스트 학생 ({socketId2})
🚪 User 테스트 학생 joined room: metaverse-classroom-1
📺 테스트 강사 started screen sharing in room metaverse-classroom-1
📺 Room metaverse-classroom-1 has 2 members: ['{socketId1}', '{socketId2}']
📺 Broadcasting screenshare:started to room metaverse-classroom-1
📺 Broadcast complete
📺 Screen share offer sent from {socketId1} to {socketId2}
📺 Screen share answer sent from {socketId2} to {socketId1}
```

---

## 📂 주요 파일 요약

### 백엔드
- `server/sockets/index.js` - Socket.IO 이벤트 핸들러 (방 관리, WebRTC 시그널링)

### 프론트엔드
- `src/services/socket.js` - Socket.IO 클라이언트 래퍼 (이벤트 관리)
- `src/hooks/useScreenShare.js` - 강사용 화면 공유 훅 (WebRTC 송신)
- `src/hooks/useScreenReceive.js` - 학생용 화면 수신 훅 (WebRTC 수신)
- `src/components/metaverse/ScreenShareOverlay.jsx` - 비디오 오버레이 UI
- `src/components/metaverse/MetaverseScene.jsx` - 메인 씬 통합 및 방 관리

### 문서
- `WEBRTC_SCREEN_SHARE.md` - 초기 구현 문서
- `TESTING_SCREEN_SHARE.md` - 테스트 가이드
- `SCREEN_SHARE_IMPLEMENTATION_LOG.md` - 이 파일 (구현 및 버그 수정 로그)

---

## ⚠️ 알려진 제한사항

### 1. 멀티플레이어 캐릭터 렌더링 미구현
- 다른 플레이어의 3D 캐릭터가 보이지 않음
- 각자 자기 캐릭터만 보임
- 하지만 Socket.IO 방 시스템은 작동하므로 화면 공유는 정상 작동

### 2. STUN/TURN 서버
- 현재 Google Public STUN만 사용
- 일부 네트워크 환경에서 연결 실패 가능
- 프로덕션 환경에서는 TURN 서버 추가 권장

### 3. 브라우저 지원
- Chrome, Edge, Firefox 지원
- Safari는 제한적 지원
- 모바일에서 `getDisplayMedia()` 제한적

### 4. P2P 방식의 한계
- 학생 수가 많으면 강사 부하 증가
- 대규모 환경에서는 SFU(Selective Forwarding Unit) 고려

---

## 🚀 다음 단계 제안

### 단기
1. 오디오 공유 추가 (시스템 오디오 포함)
2. 화질 선택 옵션 (저화질/고화질)
3. 녹화 기능 (MediaRecorder API)
4. 채팅 통합

### 중기
1. 멀티플레이어 캐릭터 렌더링 구현
2. 위치 동기화
3. 다중 교실 지원
4. TURN 서버 설정 (프로덕션)

### 장기
1. SFU 도입 (대규모 지원)
2. 학생 화면 공유 (강사 승인 후)
3. 화이트보드 기능
4. 실시간 퀴즈/투표

---

## 🔧 트러블슈팅

### 문제: "Socket not connected" 로그
**원인**: `socketService.connect()`가 호출되지 않음
**해결**: MetaverseScene의 useEffect에서 자동 호출하도록 수정됨

### 문제: 버튼이 나타나지 않음
**원인**:
1. 같은 방에 없음 (Room Users 확인)
2. 이벤트 핸들러가 제거됨 (socketService.off 버그)
3. teacherInfo가 설정되지 않음

**해결**:
1. 양쪽 모두 학교 맵 입장 확인
2. socketService.off()에 핸들러 전달하도록 수정
3. 콘솔에서 `📺 🎉 RECEIVED` 로그 확인

### 문제: 화면 공유가 즉시 중지됨
**원인**: cleanup effect에서 stopSharing()이 즉시 호출됨
**해결**: cleanup에서 stopSharing() 호출 제거, 직접 정리하도록 수정

### 문제: WebRTC 연결 실패
**원인**:
1. 방화벽/보안 프로그램
2. STUN 서버 응답 없음
3. ICE candidate 교환 실패

**해결**:
1. 콘솔에서 `Connection state: failed` 확인
2. `chrome://webrtc-internals/` 에서 상세 정보 확인
3. 로컬 네트워크 설정 확인

---

## 📊 성능 최적화

### 현재 설정
- 해상도: 1920x1080
- 프레임레이트: 30fps
- 오디오: 비활성화

### 최적화 옵션
```javascript
// 저화질 모드 (학생 수 많을 때)
video: {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 24 },
}

// 고화질 모드 (학생 수 적을 때)
video: {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30 },
}
```

---

## 🎓 학습 포인트

### React Hooks
1. **Rules of Hooks**: 조건부 호출 금지, 항상 같은 순서로 호출
2. **useCallback dependencies**: 함수가 dependency에 있으면 재생성될 때마다 effect 재실행
3. **cleanup function**: dependency 변경 시 이전 effect의 cleanup이 먼저 실행됨
4. **useMemo**: 비용이 큰 계산 결과를 메모이제이션

### Socket.IO
1. **이벤트 핸들러 관리**: off() 호출 시 핸들러 전달 필요
2. **Room 시스템**: `socket.join(roomId)`, `io.to(roomId).emit()`
3. **onAny**: 모든 이벤트를 캐치할 수 있는 디버깅 도구

### WebRTC
1. **시그널링**: Socket.IO로 offer/answer/ICE candidate 교환
2. **P2P 연결**: RTCPeerConnection으로 직접 연결
3. **STUN/TURN**: NAT 통과를 위한 서버 필요
4. **MediaStream**: getDisplayMedia()로 화면 캡처, video 요소로 표시

---

## 💡 핵심 교훈

1. **디버깅이 중요하다**: 로그를 충분히 추가하면 문제 해결이 빨라짐
2. **cleanup은 신중하게**: useEffect cleanup은 의도치 않게 실행될 수 있음
3. **이벤트 핸들러 관리**: off() 호출 시 핸들러를 전달하지 않으면 모든 핸들러가 제거됨
4. **Rules of Hooks 준수**: 조건부 훅 호출 대신 enabled 파라미터 사용
5. **useMemo로 안정화**: 매 렌더마다 재생성되는 객체는 useMemo로 메모이제이션

---

## 📞 문제 발생 시 체크리스트

□ 서버가 실행 중인가? (`npm run dev:both`)
□ 양쪽 모두 같은 방에 있는가? (디버그 패널 `Room Users (2)` 확인)
□ 양쪽 모두 학교 맵에 입장했는가? (`Map: school`)
□ 강사가 교탁에 섰는가? (`At Desk: ✅`)
□ 소켓이 연결되었는가? (`Socket connected: {id}`)
□ 학생이 이벤트를 받았는가? (`🔔 [SOCKET EVENT] screenshare:started`)
□ 학생의 핸들러가 실행되었는가? (`📺 🎉 RECEIVED screenshare:started`)
□ WebRTC 연결이 확립되었는가? (`Connection state: connected`)
□ 학생이 트랙을 받았는가? (`📺 Received track from teacher`)

---

## 📝 마지막 업데이트
2025-12-05 - 모든 버그 수정 완료, 정상 작동 확인
