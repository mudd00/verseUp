# Socket.IO 이벤트 레퍼런스

> 실시간 통신을 위한 Socket.IO 이벤트 명세

**최종 업데이트**: 2024-12-22

---

## 목차

1. [연결 및 방 관리](#1-연결-및-방-관리)
2. [멀티플레이어](#2-멀티플레이어)
3. [화면 공유](#3-화면-공유)
4. [음성 채팅](#4-음성-채팅)
5. [판서 (Whiteboard)](#5-판서-whiteboard)
6. [채팅](#6-채팅)
7. [에러 처리](#7-에러-처리)

---

## 1. 연결 및 방 관리

### user:join
사용자가 소켓에 연결할 때 호출

**Client → Server**
```javascript
socket.emit('user:join', {
  user: {
    id: string,
    name: string,
    email: string,
    role: 'student' | 'instructor' | 'admin'
  }
})
```

**Server → Client (응답)**
```javascript
socket.on('user:joined', {
  success: boolean
})
```

---

### room:join
특정 방에 입장

**Client → Server**
```javascript
socket.emit('room:join', {
  roomId: string  // 예: 'metaverse-classroom-1'
})
```

---

### room:users
현재 방의 모든 사용자 목록 수신

**Server → Client**
```javascript
socket.on('room:users', {
  users: [
    {
      user: { id, name, email, role },
      socketId: string,
      position: [x, y, z],      // 초기 위치
      rotation: number,          // Y축 회전
      animation: 'idle' | 'walk' | 'run'
    }
  ]
})
```

---

### room:user-joined
새 사용자가 방에 입장했을 때

**Server → Room (broadcast)**
```javascript
socket.on('room:user-joined', {
  user: { id, name, email, role },
  socketId: string,
  position: [x, y, z],
  rotation: number,
  animation: string
})
```

---

### room:user-left
사용자가 방을 떠났을 때

**Server → Room (broadcast)**
```javascript
socket.on('room:user-left', {
  userId: string,
  socketId: string
})
```

---

### room:leave
방에서 퇴장

**Client → Server**
```javascript
socket.emit('room:leave', {
  roomId: string
})
```

---

## 2. 멀티플레이어

### player:move
플레이어 위치 업데이트 전송

**Client → Server**
```javascript
socket.emit('player:move', {
  roomId: string,
  position: [x, y, z],         // 월드 좌표
  rotation: number,             // Y축 회전 (라디안)
  animation: 'idle' | 'walk' | 'run'
})
```

**권장 전송 주기**: 위치 변화 0.1 이상일 때만

---

### player:moved
다른 플레이어의 위치 업데이트 수신

**Server → Room (broadcast, 본인 제외)**
```javascript
socket.on('player:moved', {
  socketId: string,
  userId: string,
  user: { id, name, email, role },
  position: [x, y, z],
  rotation: number,
  animation: string
})
```

---

## 3. 화면 공유

### screenshare:start
강사가 화면 공유 시작

**Client → Server**
```javascript
socket.emit('screenshare:start', {
  roomId: string
})
```

---

### screenshare:started
화면 공유가 시작됨을 방 전체에 알림

**Server → Room (broadcast)**
```javascript
socket.on('screenshare:started', {
  teacherId: string,
  teacherSocketId: string,
  teacherName: string
})
```

---

### screenshare:offer
WebRTC Offer 전송 (강사 → 학생)

**Client → Server → Target**
```javascript
// 전송
socket.emit('screenshare:offer', {
  targetSocketId: string,
  offer: RTCSessionDescriptionInit
})

// 수신
socket.on('screenshare:offer', {
  fromSocketId: string,
  offer: RTCSessionDescriptionInit
})
```

---

### screenshare:answer
WebRTC Answer 전송 (학생 → 강사)

**Client → Server → Target**
```javascript
// 전송
socket.emit('screenshare:answer', {
  targetSocketId: string,
  answer: RTCSessionDescriptionInit
})

// 수신
socket.on('screenshare:answer', {
  fromSocketId: string,
  answer: RTCSessionDescriptionInit
})
```

---

### screenshare:ice-candidate
ICE Candidate 교환

**Client → Server → Target**
```javascript
// 전송
socket.emit('screenshare:ice-candidate', {
  targetSocketId: string,
  candidate: RTCIceCandidateInit
})

// 수신
socket.on('screenshare:ice-candidate', {
  fromSocketId: string,
  candidate: RTCIceCandidateInit
})
```

---

### screenshare:stop
화면 공유 종료

**Client → Server**
```javascript
socket.emit('screenshare:stop', {
  roomId: string
})
```

---

### screenshare:stopped
화면 공유 종료 알림

**Server → Room (broadcast)**
```javascript
socket.on('screenshare:stopped', {
  teacherId: string,
  teacherSocketId: string
})
```

---

## 4. 음성 채팅

### voice:offer
음성 WebRTC Offer

**Client → Server → Target**
```javascript
socket.emit('voice:offer', {
  targetSocketId: string,
  offer: RTCSessionDescriptionInit
})

socket.on('voice:offer', {
  fromSocketId: string,
  offer: RTCSessionDescriptionInit
})
```

---

### voice:answer
음성 WebRTC Answer

**Client → Server → Target**
```javascript
socket.emit('voice:answer', {
  targetSocketId: string,
  answer: RTCSessionDescriptionInit
})

socket.on('voice:answer', {
  fromSocketId: string,
  answer: RTCSessionDescriptionInit
})
```

---

### voice:ice-candidate
음성 ICE Candidate

**Client → Server → Target**
```javascript
socket.emit('voice:ice-candidate', {
  targetSocketId: string,
  candidate: RTCIceCandidateInit
})

socket.on('voice:ice-candidate', {
  fromSocketId: string,
  candidate: RTCIceCandidateInit
})
```

---

## 5. 판서 (Whiteboard)

### whiteboard:start
판서 세션 시작

**Client → Server**
```javascript
socket.emit('whiteboard:start', {
  roomId: string
})
```

---

### whiteboard:started
판서 시작 알림

**Server → Room (broadcast)**
```javascript
socket.on('whiteboard:started', {
  teacherId: string,
  teacherSocketId: string,
  teacherName: string
})
```

---

### whiteboard:draw
그리기 데이터 전송

**Client → Server**
```javascript
socket.emit('whiteboard:draw', {
  roomId: string,
  drawData: {
    fromX: number,      // 0~1 정규화 좌표
    fromY: number,
    toX: number,
    toY: number,
    color: string,      // hex color
    lineWidth: number,
    tool: 'pen' | 'eraser'
  }
})
```

**Server → Room (broadcast, 본인 제외)**
```javascript
socket.on('whiteboard:draw', {
  drawData: { ... },
  fromSocketId: string
})
```

---

### whiteboard:clear
칠판 지우기

**Client → Server**
```javascript
socket.emit('whiteboard:clear', {
  roomId: string
})
```

**Server → Room (broadcast)**
```javascript
socket.on('whiteboard:cleared', {
  fromSocketId: string
})
```

---

### whiteboard:stop
판서 세션 종료

**Client → Server**
```javascript
socket.emit('whiteboard:stop', {
  roomId: string
})
```

**Server → Room (broadcast)**
```javascript
socket.on('whiteboard:stopped', {
  teacherId: string,
  teacherSocketId: string
})
```

---

## 6. 채팅

### chat:message
채팅 메시지 전송/수신

**Client → Server**
```javascript
socket.emit('chat:message', {
  roomId: string,
  message: string
})
```

**Server → Room (broadcast)**
```javascript
socket.on('chat:message', {
  id: string,           // `${timestamp}-${socketId}`
  userId: string,
  userName: string,
  message: string,
  timestamp: string,    // ISO 8601
  type: 'text'
})
```

---

## 7. 에러 처리

### error
서버에서 에러 발생 시

**Server → Client**
```javascript
socket.on('error', {
  message: string
})
```

**일반적인 에러 메시지**:
- `'User not authenticated'`: user:join을 먼저 호출해야 함

---

## 클라이언트 사용 예시

### 연결 및 방 입장
```javascript
import { socketService } from '@/services/socket'

// 1. 연결
const socket = socketService.connect(token)

// 2. 연결 대기
await socketService.waitForConnection()

// 3. 사용자 등록
socketService.emit('user:join', { user: currentUser })

// 4. user:joined 응답 후 방 입장
socketService.on('user:joined', ({ success }) => {
  if (success) {
    socketService.emit('room:join', { roomId: 'metaverse-classroom-1' })
  }
})

// 5. 방 사용자 목록 수신
socketService.on('room:users', ({ users }) => {
  console.log('Room users:', users)
})
```

### 플레이어 이동 전송
```javascript
// 위치 변화 감지 시
const sendPosition = (position, rotation, animation) => {
  socketService.emit('player:move', {
    roomId: 'metaverse-classroom-1',
    position: [position.x, position.y, position.z],
    rotation,
    animation
  })
}

// 다른 플레이어 위치 수신
socketService.on('player:moved', (data) => {
  updateOtherPlayer(data.socketId, data)
})
```

### 클린업
```javascript
// 컴포넌트 언마운트 시
useEffect(() => {
  return () => {
    socketService.emit('room:leave', { roomId })
    socketService.off('room:users', handleRoomUsers)
    socketService.off('player:moved', handlePlayerMoved)
  }
}, [])
```

---

## 서버 구현 참조

파일: `server/sockets/index.js`

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|-----------|--------|
| 2024-12-22 | 초기 이벤트 명세 작성 | Claude |
| 2024-12-22 | room:users, room:user-joined에 position 데이터 추가 | Claude |

