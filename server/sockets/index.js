const connectedUsers = new Map()
const rooms = new Map()

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

    // Handle disconnect
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id)

      if (user && user.roomId) {
        rooms.get(user.roomId)?.delete(socket.id)
        socket.to(user.roomId).emit('room:user-left', {
          userId: user.id,
          socketId: socket.id,
        })
      }

      connectedUsers.delete(socket.id)
      console.log(`❌ Client disconnected: ${socket.id}`)
    })
  })
}
