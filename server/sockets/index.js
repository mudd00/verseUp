const connectedUsers = new Map()
const rooms = new Map()
const screenSharing = new Map() // roomId -> { teacherId, teacherSocketId, teacherName }
const whiteboardSessions = new Map() // roomId -> { teacherId, teacherSocketId, teacherName, isActive }
const cctvSessions = new Map() // classroomId -> { isEnabled, enabledBy, viewers: Set<socketId> }
const studentLocations = new Map() // socketId -> { classroomId, position, lastUpdated }
const studentScreenSharing = new Map() // socketId -> { isSharing, consentGiven }

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`)

    // Handle user join (with optional room join)
    socket.on('user:join', (userData) => {
      const socketUser = {
        id: userData.user.id,
        socketId: socket.id,
        user: userData.user,
      }

      connectedUsers.set(socket.id, socketUser)

      // Join user-specific room for notifications
      const userRoom = `user:${userData.user.id}`
      socket.join(userRoom)
      console.log(`👤 User joined: ${userData.user.name} (${socket.id}) - Joined room ${userRoom}`)

      // roomId가 함께 전달되면 바로 room에도 join
      if (userData.roomId) {
        const roomId = userData.roomId
        socket.join(roomId)
        socketUser.roomId = roomId

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set())
        }
        rooms.get(roomId)?.add(socket.id)

        console.log(`🚪 User ${userData.user.name} auto-joined room: ${roomId}`)

        // Notify all users in the room
        io.to(roomId).emit('room:user-joined', {
          user: userData.user,
          socketId: socket.id,
          position: socketUser.position || [0, 2, 0],
          rotation: socketUser.rotation || 0,
          animation: socketUser.animation || 'idle',
        })

        // Send current room users to the new user
        const roomUsers = Array.from(rooms.get(roomId) || [])
          .map(id => connectedUsers.get(id))
          .filter(Boolean)
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

      console.log(`🚪 User ${user.user.name} joined room: ${roomId}`)

      // Notify all users in the room including self (with position for initial sync)
      io.to(roomId).emit('room:user-joined', {
        user: user.user,
        socketId: socket.id,
        position: user.position || [0, 2, 0],
        rotation: user.rotation || 0,
        animation: user.animation || 'idle',
      })

      // Send current room users to the new user (with positions for multiplayer sync)
      const roomUsers = Array.from(rooms.get(roomId) || [])
        .map(id => connectedUsers.get(id))
        .filter(Boolean)
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

        socket.to(roomId).emit('room:user-left', {
          userId: user.id,
          socketId: socket.id,
          user: user.user, // 사용자 정보 추가 (퇴장 알림용)
        })

        console.log(`🚪 User ${user.user.name} left room: ${roomId}`)
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
      console.log(`📍 ${user.user.name} entered ${locationName} in room ${roomId}`)

      // Broadcast to all users in the room (including sender)
      io.to(roomId).emit('location:entered', {
        userId: user.id,
        userName: user.user.name,
        location: location,
        locationName: locationName,
      })
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

      // Broadcast to other users in the room
      socket.to(roomId).emit('player:moved', {
        socketId: socket.id,
        userId: user.id,
        user: user.user,
        position,
        rotation,
        animation,
      })
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

      if (!user) {
        socket.emit('error', { message: 'User not authenticated' })
        return
      }

      if (user.user.role !== 'parent') {
        socket.emit('error', { message: 'Only parents can request CCTV access' })
        return
      }

      const session = cctvSessions.get(classroomId)
      if (!session || !session.isEnabled) {
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

      // Notify instructor about new viewer
      io.to(classroomId).emit('cctv:viewer-joined', {
        viewerId: user.id,
        viewerName: user.user.name,
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
      const { classroomId, position } = data
      const user = connectedUsers.get(socket.id)

      if (!user || user.user.role !== 'student') return

      studentLocations.set(socket.id, {
        studentId: user.id,
        studentName: user.user.name,
        classroomId,
        position,
        lastUpdated: new Date().toISOString(),
      })

      // Notify any watching parents in the parent room
      io.to(`parent:watching:${user.id}`).emit('student:location', {
        studentId: user.id,
        studentName: user.user.name,
        classroomId,
        position,
        lastUpdated: new Date().toISOString(),
      })
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

      io.to(roomId).emit('student:screen-started', {
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

      io.to(roomId).emit('student:screen-stopped', {
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

    // Handle disconnect
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id)

      if (user && user.roomId) {
        rooms.get(user.roomId)?.delete(socket.id)
        socket.to(user.roomId).emit('room:user-left', {
          userId: user.id,
          socketId: socket.id,
          user: user.user, // 사용자 정보 추가 (퇴장 알림용)
        })

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

        // If instructor had CCTV enabled, disable it
        for (const [classroomId, session] of cctvSessions.entries()) {
          if (session.enabledBy === user.id) {
            cctvSessions.delete(classroomId)
            io.to(classroomId).emit('cctv:disabled', { classroomId })
            console.log(`📹 CCTV disabled due to instructor disconnect: ${user.user.name}`)
          }
        }
      }

      // Clean up CCTV viewer if user was watching
      for (const [classroomId, session] of cctvSessions.entries()) {
        if (session.viewers.has(socket.id)) {
          session.viewers.delete(socket.id)
          io.to(classroomId).emit('cctv:viewer-left', {
            viewerId: connectedUsers.get(socket.id)?.id,
            viewerCount: session.viewers.size,
          })
        }
      }

      // Clean up student location
      studentLocations.delete(socket.id)

      // Clean up student screen sharing
      studentScreenSharing.delete(socket.id)

      connectedUsers.delete(socket.id)
      console.log(`❌ Client disconnected: ${socket.id}`)
    })
  })
}
