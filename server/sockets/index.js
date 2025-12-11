const connectedUsers = new Map()
const rooms = new Map()
const screenSharing = new Map() // roomId -> { teacherId, teacherSocketId, teacherName }
const whiteboardSessions = new Map() // roomId -> { teacherId, teacherSocketId, teacherName, isActive }

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`)

    // Handle user join
    socket.on('user:join', (userData) => {
      const socketUser = {
        id: userData.user.id,
        socketId: socket.id,
        user: userData.user,
      }

      connectedUsers.set(socket.id, socketUser)
      console.log(`👤 User joined: ${userData.user.name} (${socket.id})`)

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

      // Notify others in the room
      socket.to(roomId).emit('room:user-joined', {
        user: user.user,
        socketId: socket.id,
      })

      // Send current room users to the new user
      const roomUsers = Array.from(rooms.get(roomId) || [])
        .map(id => connectedUsers.get(id))
        .filter(Boolean)
        .map(u => ({ user: u?.user, socketId: u?.socketId }))

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
        })

        console.log(`🚪 User ${user.user.name} left room: ${roomId}`)
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

    // Handle disconnect
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id)

      if (user && user.roomId) {
        rooms.get(user.roomId)?.delete(socket.id)
        socket.to(user.roomId).emit('room:user-left', {
          userId: user.id,
          socketId: socket.id,
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
      }

      connectedUsers.delete(socket.id)
      console.log(`❌ Client disconnected: ${socket.id}`)
    })
  })
}
