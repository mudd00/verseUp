const connectedUsers = new Map()
const rooms = new Map()
const screenSharing = new Map() // roomId -> { teacherId, teacherSocketId, teacherName }
const whiteboardSessions = new Map() // roomId -> { teacherId, teacherSocketId, teacherName, isActive }
const cctvSessions = new Map() // classroomId -> { isEnabled, enabledBy, viewers: Set<socketId> }
const studentLocations = new Map() // socketId -> { classroomId, position, lastUpdated }
const studentScreenSharing = new Map() // socketId -> { isSharing, consentGiven }
const parentObservers = new Map() // socketId -> { parentId, studentId, isObserver: true }

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`)

    // Keep-alive ping handler (탭 비활성화 시 연결 유지)
    socket.on('ping', () => {
      // 클라이언트가 살아있음을 확인
      socket.emit('pong')
    })

    // Handle user join (with optional room join)
    socket.on('user:join', (userData) => {
      const isObserver = userData.isObserver === true
      const studentId = userData.studentId // 부모가 참관할 학생 ID

      const socketUser = {
        id: userData.user.id,
        socketId: socket.id,
        user: userData.user,
        isObserver, // 참관 모드 여부
        studentId, // 참관 대상 학생 ID (부모인 경우)
      }

      connectedUsers.set(socket.id, socketUser)

      // 부모 참관자 추적
      if (isObserver && userData.user.role === 'parent') {
        parentObservers.set(socket.id, {
          parentId: userData.user.id,
          studentId,
          isObserver: true,
        })
        console.log(`👁️ Parent ${userData.user.name} joined as OBSERVER (watching student: ${studentId})`)
      }

      // Join user-specific room for notifications
      const userRoom = `user:${userData.user.id}`
      socket.join(userRoom)
      console.log(`👤 User joined: ${userData.user.name} (${socket.id}) - Joined room ${userRoom}${isObserver ? ' [OBSERVER]' : ''}`)

      // roomId가 함께 전달되면 바로 room에도 join
      if (userData.roomId) {
        const roomId = userData.roomId
        socket.join(roomId)
        socketUser.roomId = roomId

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set())
        }
        rooms.get(roomId)?.add(socket.id)

        console.log(`🚪 User ${userData.user.name} auto-joined room: ${roomId}${isObserver ? ' [OBSERVER - NO BROADCAST]' : ''}`)

        // 참관자가 아닌 경우에만 다른 사용자에게 알림
        if (!isObserver) {
          io.to(roomId).emit('room:user-joined', {
            user: userData.user,
            socketId: socket.id,
            position: socketUser.position || [0, 2, 0],
            rotation: socketUser.rotation || 0,
            animation: socketUser.animation || 'idle',
          })
        }

        // Send current room users to the new user (참관자도 다른 사용자는 볼 수 있음)
        // 단, 다른 참관자는 제외
        const roomUsers = Array.from(rooms.get(roomId) || [])
          .map(id => connectedUsers.get(id))
          .filter(Boolean)
          .filter(u => !u.isObserver) // 다른 참관자는 제외
          .map(u => ({
            user: u?.user,
            socketId: u?.socketId,
            position: u?.position || [0, 2, 0],
            rotation: u?.rotation || 0,
            animation: u?.animation || 'idle',
          }))

        socket.emit('room:users', { users: roomUsers })
      }

      socket.emit('user:joined', { success: true })
    })

    // Handle room join
    socket.on('room:join', (data) => {
      const { roomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' })
        return
      }

      socket.join(roomId)
      user.roomId = roomId

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set())
      }
      rooms.get(roomId)?.add(socket.id)

      console.log(`🚪 User ${user.user.name} joined room: ${roomId}${user.isObserver ? ' [OBSERVER]' : ''}`)

      // 참관자가 아닌 경우에만 다른 사용자에게 알림
      if (!user.isObserver) {
        io.to(roomId).emit('room:user-joined', {
          user: user.user,
          socketId: socket.id,
          position: user.position || [0, 2, 0],
          rotation: user.rotation || 0,
          animation: user.animation || 'idle',
        })
      }

      // Send current room users to the new user (with positions for multiplayer sync)
      // 다른 참관자는 제외
      const roomUsers = Array.from(rooms.get(roomId) || [])
        .map(id => connectedUsers.get(id))
        .filter(Boolean)
        .filter(u => !u.isObserver) // 다른 참관자는 제외
        .map(u => ({
          user: u?.user,
          socketId: u?.socketId,
          position: u?.position || [0, 2, 0],
          rotation: u?.rotation || 0,
          animation: u?.animation || 'idle',
        }))

      socket.emit('room:users', { users: roomUsers })
    })

    // Handle room leave
    socket.on('room:leave', (data) => {
      const { roomId } = data
      const user = connectedUsers.get(socket.id)

      if (user && user.roomId === roomId) {
        socket.leave(roomId)
        rooms.get(roomId)?.delete(socket.id)
        user.roomId = undefined

        // 참관자가 아닌 경우에만 퇴장 알림
        if (!user.isObserver) {
          socket.to(roomId).emit('room:user-left', {
            userId: user.id,
            socketId: socket.id,
            user: user.user, // 사용자 정보 추가 (퇴장 알림용)
          })
        }

        console.log(`🚪 User ${user.user.name} left room: ${roomId}${user.isObserver ? ' [OBSERVER]' : ''}`)
      }
    })

    // Handle location change (학교/강의실 입장 알림)
    socket.on('location:change', (data) => {
      const { roomId, location } = data
      const user = connectedUsers.get(socket.id)

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' })
        return
      }

      const locationName = location === 'classroom' ? '강의실' : '서버'
      console.log(`📍 ${user.user.name} entered ${locationName} in room ${roomId}${user.isObserver ? ' [OBSERVER - NO BROADCAST]' : ''}`)

      // 참관자가 아닌 경우에만 위치 변경 알림
      if (!user.isObserver) {
        io.to(roomId).emit('location:entered', {
          userId: user.id,
          userName: user.user.name,
          location: location,
          locationName: locationName,
        })
      }
    })

    // Handle chat messages
    socket.on('chat:message', (data) => {
      const { roomId, message } = data
      const user = connectedUsers.get(socket.id)

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' })
        return
      }

      const chatMessage = {
        id: `${Date.now()}-${socket.id}`,
        userId: user.id,
        userName: user.user.name,
        message,
        timestamp: new Date().toISOString(),
        type: 'text',
      }

      io.to(roomId).emit('chat:message', chatMessage)
      console.log(`💬 Message in ${roomId} from ${user.user.name}: ${message}`)
    })

    // Handle WebRTC signaling
    socket.on('webrtc:offer', (data) => {
      const { targetSocketId, offer, roomId } = data
      io.to(targetSocketId).emit('webrtc:offer', {
        fromSocketId: socket.id,
        offer,
        roomId,
      })
    })

    socket.on('webrtc:answer', (data) => {
      const { targetSocketId, answer } = data
      io.to(targetSocketId).emit('webrtc:answer', {
        fromSocketId: socket.id,
        answer,
      })
    })

    socket.on('webrtc:ice-candidate', (data) => {
      const { targetSocketId, candidate } = data
      io.to(targetSocketId).emit('webrtc:ice-candidate', {
        fromSocketId: socket.id,
        candidate,
      })
    })

    // Handle screen sharing start
    socket.on('screenshare:start', (data) => {
      const { roomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' })
        return
      }

      // Store screen sharing info
      screenSharing.set(roomId, {
        teacherId: user.id,
        teacherSocketId: socket.id,
        teacherName: user.user.name,
      })

      console.log(`📺 ${user.user.name} started screen sharing in room ${roomId}`)

      // Check room membership
      const roomSockets = Array.from(rooms.get(roomId) || [])
      console.log(`📺 Room ${roomId} has ${roomSockets.length} members:`, roomSockets)

      // Notify all users in the room (including sender)
      const eventData = {
        teacherId: user.id,
        teacherSocketId: socket.id,
        teacherName: user.user.name,
      }
      console.log(`📺 Broadcasting screenshare:started to room ${roomId}:`, eventData)
      io.to(roomId).emit('screenshare:started', eventData)

      console.log(`📺 Broadcast complete`)
    })

    // Handle screen sharing stop
    socket.on('screenshare:stop', (data) => {
      const { roomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' })
        return
      }

      screenSharing.delete(roomId)
      console.log(`📺 ${user.user.name} stopped screen sharing in room ${roomId}`)

      // Notify all users in the room
      io.to(roomId).emit('screenshare:stopped', {
        teacherId: user.id,
        teacherSocketId: socket.id,
      })
    })

    // Handle screen sharing offer (teacher -> student)
    socket.on('screenshare:offer', (data) => {
      const { targetSocketId, offer } = data
      io.to(targetSocketId).emit('screenshare:offer', {
        fromSocketId: socket.id,
        offer,
      })
      console.log(`📺 Screen share offer sent from ${socket.id} to ${targetSocketId}`)
    })

    // Handle screen sharing answer (student -> teacher)
    socket.on('screenshare:answer', (data) => {
      const { targetSocketId, answer } = data
      io.to(targetSocketId).emit('screenshare:answer', {
        fromSocketId: socket.id,
        answer,
      })
      console.log(`📺 Screen share answer sent from ${socket.id} to ${targetSocketId}`)
    })

    // Handle screen sharing ICE candidates
    socket.on('screenshare:ice-candidate', (data) => {
      const { targetSocketId, candidate } = data
      io.to(targetSocketId).emit('screenshare:ice-candidate', {
        fromSocketId: socket.id,
        candidate,
      })
    })

    // Handle player position updates
    socket.on('player:move', (data) => {
      const { roomId, position, rotation, animation } = data
      const user = connectedUsers.get(socket.id)

      if (!user || user.roomId !== roomId) {
        return
      }

      // Update user position
      user.position = position
      user.rotation = rotation
      user.animation = animation

      // 참관자가 아닌 경우에만 다른 사용자에게 위치 브로드캐스트
      if (!user.isObserver) {
        socket.to(roomId).emit('player:moved', {
          socketId: socket.id,
          userId: user.id,
          user: user.user,
          position,
          rotation,
          animation,
        })
      }
    })

    // Handle voice chat signaling
    socket.on('voice:offer', (data) => {
      const { targetSocketId, offer } = data
      io.to(targetSocketId).emit('voice:offer', {
        fromSocketId: socket.id,
        offer,
      })
      console.log(`🎤 Voice offer sent from ${socket.id} to ${targetSocketId}`)
    })

    socket.on('voice:answer', (data) => {
      const { targetSocketId, answer } = data
      io.to(targetSocketId).emit('voice:answer', {
        fromSocketId: socket.id,
        answer,
      })
      console.log(`🎤 Voice answer sent from ${socket.id} to ${targetSocketId}`)
    })

    socket.on('voice:ice-candidate', (data) => {
      const { targetSocketId, candidate } = data
      io.to(targetSocketId).emit('voice:ice-candidate', {
        fromSocketId: socket.id,
        candidate,
      })
    })

    // ========== Whiteboard (판서) Handlers ==========

    // Handle whiteboard session start
    socket.on('whiteboard:start', (data) => {
      const { roomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' })
        return
      }

      // Store whiteboard session
      whiteboardSessions.set(roomId, {
        teacherId: user.id,
        teacherSocketId: socket.id,
        teacherName: user.user.name,
        isActive: true,
      })

      console.log(`🎨 ${user.user.name} started whiteboard in room ${roomId}`)

      // Notify all users in the room
      io.to(roomId).emit('whiteboard:started', {
        teacherId: user.id,
        teacherSocketId: socket.id,
        teacherName: user.user.name,
      })
    })

    // Handle whiteboard drawing data
    socket.on('whiteboard:draw', (data) => {
      const { roomId, drawData } = data
      const user = connectedUsers.get(socket.id)

      if (!user) return

      // Broadcast drawing data to all users in the room (except sender)
      socket.to(roomId).emit('whiteboard:draw', {
        drawData,
        fromSocketId: socket.id,
      })
    })

    // Handle whiteboard clear
    socket.on('whiteboard:clear', (data) => {
      const { roomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user) return

      console.log(`🎨 ${user.user.name} cleared whiteboard in room ${roomId}`)

      // Broadcast clear command to all users in the room
      io.to(roomId).emit('whiteboard:cleared', {
        fromSocketId: socket.id,
      })
    })

    // Handle whiteboard session stop
    socket.on('whiteboard:stop', (data) => {
      const { roomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user) return

      whiteboardSessions.delete(roomId)
      console.log(`🎨 ${user.user.name} stopped whiteboard in room ${roomId}`)

      // Notify all users in the room
      io.to(roomId).emit('whiteboard:stopped', {
        teacherId: user.id,
        teacherSocketId: socket.id,
      })
    })

    // ========== CCTV Handlers ==========

    // Handle CCTV enable (instructor only)
    socket.on('cctv:enable', (data) => {
      const { classroomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' })
        return
      }

      // Check if user is instructor
      if (user.user.role !== 'instructor' && user.user.role !== 'admin') {
        socket.emit('error', { message: 'Only instructors can enable CCTV' })
        return
      }

      // Enable CCTV for this classroom
      cctvSessions.set(classroomId, {
        isEnabled: true,
        enabledBy: user.id,
        enabledByName: user.user.name,
        viewers: new Set(),
        startedAt: new Date().toISOString(),
      })

      console.log(`📹 CCTV enabled for classroom ${classroomId} by ${user.user.name}`)
      console.log(`📹 [CCTV] Session stored:`, cctvSessions.get(classroomId))

      // Notify all users in the room
      io.to(classroomId).emit('cctv:enabled', {
        classroomId,
        enabledBy: user.id,
        enabledByName: user.user.name,
      })

      socket.emit('cctv:enable-success', { classroomId })
    })

    // Handle CCTV disable (instructor only)
    socket.on('cctv:disable', (data) => {
      const { classroomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' })
        return
      }

      const session = cctvSessions.get(classroomId)
      if (!session) {
        socket.emit('error', { message: 'CCTV session not found' })
        return
      }

      // Only the instructor who enabled or admin can disable
      if (session.enabledBy !== user.id && user.user.role !== 'admin') {
        socket.emit('error', { message: 'Only the instructor who enabled can disable CCTV' })
        return
      }

      cctvSessions.delete(classroomId)

      console.log(`📹 CCTV disabled for classroom ${classroomId} by ${user.user.name}`)

      // Notify all users and viewers
      io.to(classroomId).emit('cctv:disabled', { classroomId })

      socket.emit('cctv:disable-success', { classroomId })
    })

    // Handle CCTV request (parent only)
    socket.on('cctv:request', (data) => {
      const { classroomId, studentId } = data
      const user = connectedUsers.get(socket.id)

      console.log(`📹 [CCTV Request] Received from socket ${socket.id}, classroomId: ${classroomId}`)

      if (!user) {
        console.log(`📹 [CCTV Request] User not authenticated`)
        socket.emit('error', { message: 'User not authenticated' })
        return
      }

      console.log(`📹 [CCTV Request] User: ${user.user.name}, role: ${user.user.role}`)

      if (user.user.role !== 'parent') {
        console.log(`📹 [CCTV Request] Not a parent, rejecting`)
        socket.emit('error', { message: 'Only parents can request CCTV access' })
        return
      }

      const session = cctvSessions.get(classroomId)
      console.log(`📹 [CCTV Request] Session for ${classroomId}:`, session ? 'found, isEnabled=' + session.isEnabled : 'not found')

      if (!session || !session.isEnabled) {
        console.log(`📹 [CCTV Request] CCTV not available`)
        socket.emit('cctv:unavailable', {
          classroomId,
          reason: 'CCTV is not enabled for this classroom',
        })
        return
      }

      // Add viewer
      session.viewers.add(socket.id)

      // Join the classroom room to receive CCTV stream
      socket.join(`cctv:${classroomId}`)

      console.log(`📹 Parent ${user.user.name} started viewing CCTV for classroom ${classroomId}`)

      socket.emit('cctv:authorized', {
        classroomId,
        viewerCount: session.viewers.size,
      })

      // Notify instructor about new viewer (include socketId for WebRTC)
      io.to(classroomId).emit('cctv:viewer-joined', {
        viewerId: user.id,
        viewerName: user.user.name,
        viewerSocketId: socket.id, // 강사가 WebRTC 연결을 설정하기 위해 필요
        viewerCount: session.viewers.size,
      })
    })

    // Handle CCTV stop viewing (parent)
    socket.on('cctv:stop-viewing', (data) => {
      const { classroomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user) return

      const session = cctvSessions.get(classroomId)
      if (session) {
        session.viewers.delete(socket.id)
        socket.leave(`cctv:${classroomId}`)

        console.log(`📹 Parent ${user.user.name} stopped viewing CCTV for classroom ${classroomId}`)

        io.to(classroomId).emit('cctv:viewer-left', {
          viewerId: user.id,
          viewerCount: session.viewers.size,
        })
      }
    })

    // Handle CCTV stream offer (from classroom camera to viewer)
    socket.on('cctv:offer', (data) => {
      const { targetSocketId, offer, classroomId } = data
      io.to(targetSocketId).emit('cctv:offer', {
        fromSocketId: socket.id,
        offer,
        classroomId,
      })
      console.log(`📹 CCTV offer sent from ${socket.id} to ${targetSocketId}`)
    })

    // Handle CCTV stream answer
    socket.on('cctv:answer', (data) => {
      const { targetSocketId, answer } = data
      io.to(targetSocketId).emit('cctv:answer', {
        fromSocketId: socket.id,
        answer,
      })
      console.log(`📹 CCTV answer sent from ${socket.id} to ${targetSocketId}`)
    })

    // Handle CCTV ICE candidate
    socket.on('cctv:ice-candidate', (data) => {
      const { targetSocketId, candidate } = data
      io.to(targetSocketId).emit('cctv:ice-candidate', {
        fromSocketId: socket.id,
        candidate,
      })
    })

    // Handle CCTV status request
    socket.on('cctv:status', (data) => {
      const { classroomId } = data
      const session = cctvSessions.get(classroomId)

      console.log(`📹 [CCTV Status Request] classroomId: ${classroomId}, session:`, session ? 'found' : 'not found', ', isEnabled:', session?.isEnabled)

      socket.emit('cctv:status', {
        classroomId,
        isEnabled: session?.isEnabled || false,
        viewerCount: session?.viewers?.size || 0,
        enabledBy: session?.enabledBy || null,
        enabledByName: session?.enabledByName || null,
      })
    })

    // ========== Student Location Tracking ==========

    // Handle student location update (for parent monitoring)
    socket.on('student:location-update', (data) => {
      const { classroomId, position, locationName, mapType, classroom } = data
      const user = connectedUsers.get(socket.id)

      if (!user || user.user.role !== 'student') return

      const locationData = {
        studentId: user.id,
        studentName: user.user.name,
        classroomId,
        position,
        locationName: locationName || '알 수 없음', // 위치 이름 (운동장/복도/강의실 A 등)
        mapType: mapType || 'main', // main 또는 school
        classroom: classroom || null, // 교실 이름 (A, B 등) 또는 null
        lastUpdated: new Date().toISOString(),
      }

      studentLocations.set(socket.id, locationData)

      // Notify any watching parents in the parent room
      io.to(`parent:watching:${user.id}`).emit('student:location', locationData)
    })

    // Handle parent subscribing to student location
    socket.on('parent:watch-student', (data) => {
      const { studentId } = data
      const user = connectedUsers.get(socket.id)

      if (!user || user.user.role !== 'parent') {
        socket.emit('error', { message: 'Only parents can watch students' })
        return
      }

      socket.join(`parent:watching:${studentId}`)
      console.log(`👁️ Parent ${user.user.name} started watching student ${studentId}`)

      // Send current location if available
      for (const [socketId, location] of studentLocations.entries()) {
        if (location.studentId === studentId) {
          socket.emit('student:location', location)
          console.log(`📍 [Parent Watch] Sent current location to parent:`, location.locationName)
          break
        }
      }

      // Send current screen sharing status if student is sharing
      for (const [socketId, screenInfo] of studentScreenSharing.entries()) {
        if (screenInfo.studentId === studentId && screenInfo.isSharing) {
          socket.emit('student:screen-started', {
            studentId: screenInfo.studentId,
            studentName: screenInfo.studentName,
            socketId: socketId,
          })
          console.log(`🖥️ [Parent Watch] Sent current screen sharing status to parent: ${screenInfo.studentName} is sharing`)
          break
        }
      }

      // Send CCTV status for the classroom the student is in
      for (const [socketId, location] of studentLocations.entries()) {
        if (location.studentId === studentId && location.classroomId) {
          const cctvSession = cctvSessions.get(location.classroomId)
          if (cctvSession) {
            socket.emit('cctv:status', {
              classroomId: location.classroomId,
              isEnabled: cctvSession.isEnabled || false,
              viewerCount: cctvSession.viewers?.size || 0,
              enabledBy: cctvSession.enabledBy || null,
              enabledByName: cctvSession.enabledByName || null,
            })
            console.log(`📹 [Parent Watch] Sent CCTV status to parent: ${cctvSession.isEnabled ? 'enabled' : 'disabled'}`)
          }
          break
        }
      }
    })

    // Handle parent unsubscribing from student location
    socket.on('parent:unwatch-student', (data) => {
      const { studentId } = data
      socket.leave(`parent:watching:${studentId}`)
    })

    // ========== Student Screen Sharing (Opt-in) ==========

    // Handle student consent for screen sharing
    socket.on('student:screen-consent', (data) => {
      const { consent } = data
      const user = connectedUsers.get(socket.id)

      if (!user || user.user.role !== 'student') return

      studentScreenSharing.set(socket.id, {
        studentId: user.id,
        studentName: user.user.name,
        consentGiven: consent,
        isSharing: false,
      })

      console.log(`🖥️ Student ${user.user.name} ${consent ? 'gave' : 'revoked'} screen sharing consent`)

      // Notify the room
      if (user.roomId) {
        io.to(user.roomId).emit('student:screen-consent-changed', {
          studentId: user.id,
          studentName: user.user.name,
          consentGiven: consent,
        })
      }
    })

    // Handle student starting screen share
    socket.on('student:screen-start', (data) => {
      const { roomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user || user.user.role !== 'student') return

      const consent = studentScreenSharing.get(socket.id)
      if (!consent?.consentGiven) {
        socket.emit('error', { message: 'Screen sharing consent not given' })
        return
      }

      consent.isSharing = true
      studentScreenSharing.set(socket.id, consent)

      console.log(`🖥️ Student ${user.user.name} started screen sharing in room ${roomId}`)

      // 방에 있는 사용자들에게 알림
      io.to(roomId).emit('student:screen-started', {
        studentId: user.id,
        studentName: user.user.name,
        socketId: socket.id,
      })

      // 해당 학생을 watching 중인 부모에게도 알림
      io.to(`parent:watching:${user.id}`).emit('student:screen-started', {
        studentId: user.id,
        studentName: user.user.name,
        socketId: socket.id,
      })
    })

    // Handle student stopping screen share
    socket.on('student:screen-stop', (data) => {
      const { roomId } = data
      const user = connectedUsers.get(socket.id)

      if (!user) return

      const consent = studentScreenSharing.get(socket.id)
      if (consent) {
        consent.isSharing = false
        studentScreenSharing.set(socket.id, consent)
      }

      console.log(`🖥️ Student ${user.user.name} stopped screen sharing in room ${roomId}`)

      // 방에 있는 사용자들에게 알림
      io.to(roomId).emit('student:screen-stopped', {
        studentId: user.id,
        socketId: socket.id,
      })

      // 해당 학생을 watching 중인 부모에게도 알림
      io.to(`parent:watching:${user.id}`).emit('student:screen-stopped', {
        studentId: user.id,
        socketId: socket.id,
      })
    })

    // Handle student screen offer (student -> instructor/parent)
    socket.on('student:screen-offer', (data) => {
      const { targetSocketId, offer } = data
      io.to(targetSocketId).emit('student:screen-offer', {
        fromSocketId: socket.id,
        offer,
      })
    })

    // Handle student screen answer
    socket.on('student:screen-answer', (data) => {
      const { targetSocketId, answer } = data
      io.to(targetSocketId).emit('student:screen-answer', {
        fromSocketId: socket.id,
        answer,
      })
    })

    // Handle student screen ICE candidate
    socket.on('student:screen-ice', (data) => {
      const { targetSocketId, candidate } = data
      io.to(targetSocketId).emit('student:screen-ice', {
        fromSocketId: socket.id,
        candidate,
      })
    })

    // Handle parent requesting to view student screen (FR-7)
    socket.on('student:screen-request', (data) => {
      const { targetSocketId } = data
      console.log(`🖥️ Parent ${socket.id} requesting screen from student ${targetSocketId}`)
      io.to(targetSocketId).emit('student:screen-request', {
        targetSocketId: socket.id, // Tell student to send offer to this socket
      })
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id)

      if (user && user.roomId) {
        rooms.get(user.roomId)?.delete(socket.id)

        // 참관자가 아닌 경우에만 퇴장 알림
        if (!user.isObserver) {
          socket.to(user.roomId).emit('room:user-left', {
            userId: user.id,
            socketId: socket.id,
            user: user.user, // 사용자 정보 추가 (퇴장 알림용)
          })
        }

        // If user was screen sharing, stop it
        const sharingInfo = screenSharing.get(user.roomId)
        if (sharingInfo && sharingInfo.teacherSocketId === socket.id) {
          screenSharing.delete(user.roomId)
          socket.to(user.roomId).emit('screenshare:stopped', {
            teacherId: user.id,
            teacherSocketId: socket.id,
          })
          console.log(`📺 Screen sharing stopped due to disconnect: ${user.user.name}`)
        }

        // If user was using whiteboard, stop it
        const whiteboardInfo = whiteboardSessions.get(user.roomId)
        if (whiteboardInfo && whiteboardInfo.teacherSocketId === socket.id) {
          whiteboardSessions.delete(user.roomId)
          socket.to(user.roomId).emit('whiteboard:stopped', {
            teacherId: user.id,
            teacherSocketId: socket.id,
          })
          console.log(`🎨 Whiteboard stopped due to disconnect: ${user.user.name}`)
        }
      }

      // Clean up student location
      studentLocations.delete(socket.id)

      // Clean up parent observer
      parentObservers.delete(socket.id)

      connectedUsers.delete(socket.id)
      console.log(`❌ Client disconnected: ${socket.id}${user?.isObserver ? ' [OBSERVER]' : ''}`)
    })
  })
}
