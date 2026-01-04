# VerseUp 1차 프로젝트 Socket.IO 이벤트 명세서

> 2차 프로젝트 Spring WebSocket 개발을 위한 실시간 이벤트 상세 명세

## 목차
1. [연결 및 사용자 관리](#1-연결-및-사용자-관리)
2. [방(Room) 관리](#2-방room-관리)
3. [플레이어 동기화](#3-플레이어-동기화)
4. [채팅](#4-채팅)
5. [화면 공유 (강사)](#5-화면-공유-강사)
6. [음성 채팅](#6-음성-채팅)
7. [화이트보드 (판서)](#7-화이트보드-판서)
8. [CCTV (수업 참관)](#8-cctv-수업-참관)
9. [학생 화면 공유](#9-학생-화면-공유)
10. [부모 모니터링](#10-부모-모니터링)
11. [WebRTC 시그널링](#11-webrtc-시그널링)

---

## 이벤트 표기법

- **C→S**: 클라이언트 → 서버 (emit)
- **S→C**: 서버 → 클라이언트 (emit)
- **S→Room**: 서버 → 특정 방의 모든 클라이언트
- **S→Target**: 서버 → 특정 소켓

---

## 서버 상태 저장소 (In-Memory)

```javascript
// Spring에서는 ConcurrentHashMap 또는 Redis로 구현
const connectedUsers = new Map()    // socketId -> user info
const rooms = new Map()             // roomId -> Set<socketId>
const screenSharing = new Map()     // roomId -> { teacherId, teacherSocketId, teacherName }
const whiteboardSessions = new Map() // roomId -> { teacherId, isActive }
const cctvSessions = new Map()      // classroomId -> { isEnabled, enabledBy, viewers: Set }
const studentLocations = new Map()  // socketId -> location data
const studentScreenSharing = new Map() // socketId -> { isSharing, consentGiven }
const parentObservers = new Map()   // socketId -> { parentId, studentId }
```

---

## 1. 연결 및 사용자 관리

### ping / pong
탭 비활성화 시 연결 유지용 keep-alive

**C→S: ping**
```javascript
socket.emit('ping')
```

**S→C: pong**
```javascript
socket.on('pong', () => {})
```

---

### user:join
사용자 접속 (인증 후 호출)

**C→S**
```javascript
socket.emit('user:join', {
  user: {
    id: "uuid",
    name: "홍길동",
    email: "user@example.com",
    role: "student|instructor|parent|admin"
  },
  roomId: "classroom_A",  // 선택: 방에 바로 입장
  isObserver: false,      // 부모 참관 모드
  studentId: "uuid"       // 부모인 경우 참관 대상 학생 ID
})
```

**S→C: user:joined**
```javascript
socket.on('user:joined', {
  success: true
})
```

**서버 동작**:
1. `connectedUsers`에 사용자 저장
2. `user:{userId}` 룸에 자동 조인 (알림용)
3. roomId가 있으면 해당 방에 조인
4. 참관자가 아니면 방의 다른 사용자들에게 `room:user-joined` 브로드캐스트
5. 현재 방 사용자 목록을 `room:users`로 전송

---

## 2. 방(Room) 관리

### room:join
방 입장

**C→S**
```javascript
socket.emit('room:join', {
  roomId: "classroom_A"
})
```

**S→Room: room:user-joined** (참관자 제외)
```javascript
io.to(roomId).emit('room:user-joined', {
  user: {
    id: "uuid",
    name: "홍길동",
    role: "student"
  },
  socketId: "socket_id",
  position: [0, 2, 0],    // [x, y, z]
  rotation: 0,            // y축 회전 (라디안)
  animation: "idle"       // idle|walk|run
})
```

**S→C: room:users** (입장한 사용자에게)
```javascript
socket.emit('room:users', {
  users: [
    {
      user: { id, name, role },
      socketId: "socket_id",
      position: [0, 2, 0],
      rotation: 0,
      animation: "idle"
    }
  ]
})
```

---

### room:leave
방 퇴장

**C→S**
```javascript
socket.emit('room:leave', {
  roomId: "classroom_A"
})
```

**S→Room: room:user-left** (참관자 제외)
```javascript
socket.to(roomId).emit('room:user-left', {
  userId: "uuid",
  socketId: "socket_id",
  user: { name, role }
})
```

---

### location:change
위치 변경 알림 (강의실 입장 등)

**C→S**
```javascript
socket.emit('location:change', {
  roomId: "classroom_A",
  location: "classroom|lobby|playground"
})
```

**S→Room: location:entered** (참관자 제외)
```javascript
io.to(roomId).emit('location:entered', {
  userId: "uuid",
  userName: "홍길동",
  location: "classroom",
  locationName: "강의실"
})
```

---

## 3. 플레이어 동기화

### player:move
플레이어 위치 업데이트 (30fps 권장)

**C→S**
```javascript
socket.emit('player:move', {
  roomId: "classroom_A",
  position: [10.5, 2, 5.3],  // [x, y, z]
  rotation: 1.57,             // y축 회전 (라디안)
  animation: "walk"           // idle|walk|run
})
```

**S→Room: player:moved** (참관자 제외, 본인 제외)
```javascript
socket.to(roomId).emit('player:moved', {
  socketId: "socket_id",
  userId: "uuid",
  user: { id, name, role },
  position: [10.5, 2, 5.3],
  rotation: 1.57,
  animation: "walk"
})
```

---

## 4. 채팅

### chat:message
채팅 메시지 전송

**C→S**
```javascript
socket.emit('chat:message', {
  roomId: "classroom_A",
  message: "안녕하세요!"
})
```

**S→Room: chat:message**
```javascript
io.to(roomId).emit('chat:message', {
  id: "timestamp-socketId",
  userId: "uuid",
  userName: "홍길동",
  message: "안녕하세요!",
  timestamp: "2024-01-01T00:00:00Z",
  type: "text"
})
```

---

## 5. 화면 공유 (강사)

### screenshare:start
강사 화면 공유 시작

**C→S**
```javascript
socket.emit('screenshare:start', {
  roomId: "classroom_A"
})
```

**S→Room: screenshare:started**
```javascript
io.to(roomId).emit('screenshare:started', {
  teacherId: "uuid",
  teacherSocketId: "socket_id",
  teacherName: "김강사"
})
```

---

### screenshare:stop
화면 공유 중지

**C→S**
```javascript
socket.emit('screenshare:stop', {
  roomId: "classroom_A"
})
```

**S→Room: screenshare:stopped**
```javascript
io.to(roomId).emit('screenshare:stopped', {
  teacherId: "uuid",
  teacherSocketId: "socket_id"
})
```

---

### screenshare:offer
WebRTC Offer 전송 (강사 → 학생)

**C→S**
```javascript
socket.emit('screenshare:offer', {
  targetSocketId: "student_socket_id",
  offer: { /* RTCSessionDescription */ }
})
```

**S→Target: screenshare:offer**
```javascript
io.to(targetSocketId).emit('screenshare:offer', {
  fromSocketId: "teacher_socket_id",
  offer: { /* RTCSessionDescription */ }
})
```

---

### screenshare:answer
WebRTC Answer 전송 (학생 → 강사)

**C→S**
```javascript
socket.emit('screenshare:answer', {
  targetSocketId: "teacher_socket_id",
  answer: { /* RTCSessionDescription */ }
})
```

**S→Target: screenshare:answer**
```javascript
io.to(targetSocketId).emit('screenshare:answer', {
  fromSocketId: "student_socket_id",
  answer: { /* RTCSessionDescription */ }
})
```

---

### screenshare:ice-candidate
ICE Candidate 교환

**C→S**
```javascript
socket.emit('screenshare:ice-candidate', {
  targetSocketId: "target_socket_id",
  candidate: { /* RTCIceCandidate */ }
})
```

**S→Target: screenshare:ice-candidate**
```javascript
io.to(targetSocketId).emit('screenshare:ice-candidate', {
  fromSocketId: "sender_socket_id",
  candidate: { /* RTCIceCandidate */ }
})
```

---

## 6. 음성 채팅

### voice:offer
음성 통화 Offer

**C→S**
```javascript
socket.emit('voice:offer', {
  targetSocketId: "target_socket_id",
  offer: { /* RTCSessionDescription */ }
})
```

**S→Target: voice:offer**
```javascript
io.to(targetSocketId).emit('voice:offer', {
  fromSocketId: "sender_socket_id",
  offer: { /* RTCSessionDescription */ }
})
```

---

### voice:answer
음성 통화 Answer

**C→S**
```javascript
socket.emit('voice:answer', {
  targetSocketId: "target_socket_id",
  answer: { /* RTCSessionDescription */ }
})
```

**S→Target: voice:answer**

---

### voice:ice-candidate
음성 ICE Candidate

**C→S**
```javascript
socket.emit('voice:ice-candidate', {
  targetSocketId: "target_socket_id",
  candidate: { /* RTCIceCandidate */ }
})
```

**S→Target: voice:ice-candidate**

---

## 7. 화이트보드 (판서)

### whiteboard:start
화이트보드 세션 시작 (강사)

**C→S**
```javascript
socket.emit('whiteboard:start', {
  roomId: "classroom_A"
})
```

**S→Room: whiteboard:started**
```javascript
io.to(roomId).emit('whiteboard:started', {
  teacherId: "uuid",
  teacherSocketId: "socket_id",
  teacherName: "김강사"
})
```

---

### whiteboard:draw
그리기 데이터 전송

**C→S**
```javascript
socket.emit('whiteboard:draw', {
  roomId: "classroom_A",
  drawData: {
    type: "line|circle|rect|text|eraser",
    points: [[x1, y1], [x2, y2]],
    color: "#FF0000",
    width: 5,
    // type에 따라 추가 속성
  }
})
```

**S→Room: whiteboard:draw** (본인 제외)
```javascript
socket.to(roomId).emit('whiteboard:draw', {
  drawData: { ... },
  fromSocketId: "socket_id"
})
```

---

### whiteboard:clear
화이트보드 초기화

**C→S**
```javascript
socket.emit('whiteboard:clear', {
  roomId: "classroom_A"
})
```

**S→Room: whiteboard:cleared**
```javascript
io.to(roomId).emit('whiteboard:cleared', {
  fromSocketId: "socket_id"
})
```

---

### whiteboard:stop
화이트보드 세션 종료

**C→S**
```javascript
socket.emit('whiteboard:stop', {
  roomId: "classroom_A"
})
```

**S→Room: whiteboard:stopped**
```javascript
io.to(roomId).emit('whiteboard:stopped', {
  teacherId: "uuid",
  teacherSocketId: "socket_id"
})
```

---

## 8. CCTV (수업 참관)

### cctv:enable
CCTV 활성화 (강사만)

**C→S**
```javascript
socket.emit('cctv:enable', {
  classroomId: "classroom_A"
})
```

**S→Room: cctv:enabled**
```javascript
io.to(classroomId).emit('cctv:enabled', {
  classroomId: "classroom_A",
  enabledBy: "instructor_uuid",
  enabledByName: "김강사"
})
```

**S→C: cctv:enable-success**
```javascript
socket.emit('cctv:enable-success', {
  classroomId: "classroom_A"
})
```

---

### cctv:disable
CCTV 비활성화 (강사만)

**C→S**
```javascript
socket.emit('cctv:disable', {
  classroomId: "classroom_A"
})
```

**S→Room: cctv:disabled**
```javascript
io.to(classroomId).emit('cctv:disabled', {
  classroomId: "classroom_A"
})
```

---

### cctv:request
CCTV 시청 요청 (부모만)

**C→S**
```javascript
socket.emit('cctv:request', {
  classroomId: "classroom_A",
  studentId: "student_uuid"  // 자녀 ID
})
```

**S→C: cctv:authorized** (허용 시)
```javascript
socket.emit('cctv:authorized', {
  classroomId: "classroom_A",
  viewerCount: 3
})
```

**S→C: cctv:unavailable** (불가 시)
```javascript
socket.emit('cctv:unavailable', {
  classroomId: "classroom_A",
  reason: "CCTV is not enabled for this classroom"
})
```

**S→Room: cctv:viewer-joined** (강사에게 알림)
```javascript
io.to(classroomId).emit('cctv:viewer-joined', {
  viewerId: "parent_uuid",
  viewerName: "김부모",
  viewerSocketId: "socket_id",  // WebRTC 연결용
  viewerCount: 3
})
```

---

### cctv:stop-viewing
CCTV 시청 종료 (부모)

**C→S**
```javascript
socket.emit('cctv:stop-viewing', {
  classroomId: "classroom_A"
})
```

**S→Room: cctv:viewer-left**
```javascript
io.to(classroomId).emit('cctv:viewer-left', {
  viewerId: "parent_uuid",
  viewerCount: 2
})
```

---

### cctv:status
CCTV 상태 조회

**C→S**
```javascript
socket.emit('cctv:status', {
  classroomId: "classroom_A"
})
```

**S→C: cctv:status**
```javascript
socket.emit('cctv:status', {
  classroomId: "classroom_A",
  isEnabled: true,
  viewerCount: 3,
  enabledBy: "instructor_uuid",
  enabledByName: "김강사"
})
```

---

### cctv:offer / cctv:answer / cctv:ice-candidate
CCTV WebRTC 시그널링 (screenshare와 동일 패턴)

---

## 9. 학생 화면 공유

### student:screen-consent
학생 화면 공유 동의

**C→S**
```javascript
socket.emit('student:screen-consent', {
  consent: true  // 동의 또는 철회
})
```

**S→Room: student:screen-consent-changed**
```javascript
io.to(roomId).emit('student:screen-consent-changed', {
  studentId: "uuid",
  studentName: "홍길동",
  consentGiven: true
})
```

---

### student:screen-start
학생 화면 공유 시작

**C→S**
```javascript
socket.emit('student:screen-start', {
  roomId: "classroom_A"
})
```

**S→Room: student:screen-started**
```javascript
io.to(roomId).emit('student:screen-started', {
  studentId: "uuid",
  studentName: "홍길동",
  socketId: "socket_id"
})
```

**S→Parent: student:screen-started** (해당 학생 구독 중인 부모에게)
```javascript
io.to(`parent:watching:${studentId}`).emit('student:screen-started', {
  studentId: "uuid",
  studentName: "홍길동",
  socketId: "socket_id"
})
```

---

### student:screen-stop
학생 화면 공유 중지

**S→Room: student:screen-stopped**
```javascript
io.to(roomId).emit('student:screen-stopped', {
  studentId: "uuid",
  socketId: "socket_id"
})
```

---

### student:screen-request
학생 화면 시청 요청 (부모/강사 → 학생)

**C→S**
```javascript
socket.emit('student:screen-request', {
  targetSocketId: "student_socket_id"
})
```

**S→Target: student:screen-request** (학생에게)
```javascript
io.to(targetSocketId).emit('student:screen-request', {
  targetSocketId: "requester_socket_id"  // 학생이 offer를 보낼 대상
})
```

---

### student:screen-offer / student:screen-answer / student:screen-ice
학생 화면 WebRTC 시그널링

---

## 10. 부모 모니터링

### student:location-update
학생 위치 업데이트 (학생 클라이언트에서 주기적 전송)

**C→S**
```javascript
socket.emit('student:location-update', {
  classroomId: "classroom_A",
  position: [10.5, 2, 5.3],
  locationName: "강의실 A",
  mapType: "school",      // main|school
  classroom: "A"          // 교실 이름 또는 null
})
```

**S→Parent: student:location** (해당 학생 구독 중인 부모에게)
```javascript
io.to(`parent:watching:${studentId}`).emit('student:location', {
  studentId: "uuid",
  studentName: "홍길동",
  classroomId: "classroom_A",
  position: [10.5, 2, 5.3],
  locationName: "강의실 A",
  mapType: "school",
  classroom: "A",
  lastUpdated: "2024-01-01T00:00:00Z"
})
```

---

### parent:watch-student
학생 모니터링 시작 (부모)

**C→S**
```javascript
socket.emit('parent:watch-student', {
  studentId: "student_uuid"
})
```

**서버 동작**:
1. `parent:watching:{studentId}` 룸에 조인
2. 현재 학생 위치 정보가 있으면 즉시 전송
3. 현재 학생 화면 공유 중이면 알림
4. 해당 교실 CCTV 상태 전송

---

### parent:unwatch-student
학생 모니터링 종료 (부모)

**C→S**
```javascript
socket.emit('parent:unwatch-student', {
  studentId: "student_uuid"
})
```

---

## 11. WebRTC 시그널링

### webrtc:offer
일반 WebRTC Offer (1:1 통신용)

**C→S**
```javascript
socket.emit('webrtc:offer', {
  targetSocketId: "target_socket_id",
  offer: {
    type: "offer",
    sdp: "v=0\r\n..."
  },
  roomId: "classroom_A"
})
```

**S→Target: webrtc:offer**
```javascript
io.to(targetSocketId).emit('webrtc:offer', {
  fromSocketId: "sender_socket_id",
  offer: { ... },
  roomId: "classroom_A"
})
```

---

### webrtc:answer
WebRTC Answer

**C→S**
```javascript
socket.emit('webrtc:answer', {
  targetSocketId: "target_socket_id",
  answer: {
    type: "answer",
    sdp: "v=0\r\n..."
  }
})
```

**S→Target: webrtc:answer**
```javascript
io.to(targetSocketId).emit('webrtc:answer', {
  fromSocketId: "sender_socket_id",
  answer: { ... }
})
```

---

### webrtc:ice-candidate
ICE Candidate 교환

**C→S**
```javascript
socket.emit('webrtc:ice-candidate', {
  targetSocketId: "target_socket_id",
  candidate: {
    candidate: "candidate:...",
    sdpMid: "0",
    sdpMLineIndex: 0
  }
})
```

**S→Target: webrtc:ice-candidate**
```javascript
io.to(targetSocketId).emit('webrtc:ice-candidate', {
  fromSocketId: "sender_socket_id",
  candidate: { ... }
})
```

---

## 연결 해제 처리

### disconnect
클라이언트 연결 해제 시 서버 자동 처리

**서버 동작**:
1. 방에서 제거 및 `room:user-left` 브로드캐스트 (참관자 제외)
2. 화면 공유 중이었으면 `screenshare:stopped` 브로드캐스트
3. 화이트보드 사용 중이었으면 `whiteboard:stopped` 브로드캐스트
4. 학생 위치 정보 삭제
5. 부모 참관자 정보 삭제
6. `connectedUsers`에서 제거

---

## 에러 이벤트

### error
서버에서 클라이언트로 에러 전송

**S→C: error**
```javascript
socket.emit('error', {
  message: "User not authenticated"
})
```

---

## 부록: 참관자 모드 동작

부모가 참관 모드(`isObserver: true`)로 접속 시:
- 다른 사용자에게 입장/퇴장 알림이 전송되지 않음
- 다른 참관자의 정보도 room:users에 포함되지 않음
- player:move 이벤트가 브로드캐스트되지 않음
- 채팅, 화면 공유, CCTV 등 수신만 가능

---

## 부록: ICE 서버 설정

```javascript
const iceServers = [
  // STUN 서버 (무료)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },

  // TURN 서버 (OpenRelay 무료)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
]
```

---

## 부록: Spring WebSocket 마이그레이션 가이드

### 1. 의존성
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

### 2. 핸들러 구조
```java
@Component
public class SocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> rooms = new ConcurrentHashMap<>();

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        JsonNode json = objectMapper.readTree(message.getPayload());
        String event = json.get("event").asText();
        JsonNode data = json.get("data");

        switch (event) {
            case "user:join":
                handleUserJoin(session, data);
                break;
            case "room:join":
                handleRoomJoin(session, data);
                break;
            // ... 기타 이벤트
        }
    }
}
```

### 3. 메시지 포맷
```json
{
  "event": "chat:message",
  "data": {
    "roomId": "classroom_A",
    "message": "안녕하세요"
  }
}
```

### 4. 브로드캐스트
```java
private void broadcastToRoom(String roomId, String event, Object data) {
    Set<String> roomSessions = rooms.get(roomId);
    if (roomSessions != null) {
        String message = createMessage(event, data);
        for (String sessionId : roomSessions) {
            WebSocketSession session = sessions.get(sessionId);
            if (session != null && session.isOpen()) {
                session.sendMessage(new TextMessage(message));
            }
        }
    }
}
```

### 5. 고려사항
- Socket.IO의 room 기능 → 직접 구현 필요
- 재연결 시 상태 복구 로직 필요
- Redis Pub/Sub 고려 (서버 스케일아웃 시)
