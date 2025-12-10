import { io } from 'socket.io-client'
import { SOCKET_URL } from '@/utils/constants.js'

class SocketService {
  constructor() {
    this.socket = null
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    // Debug: Log all incoming events
    this.socket.onAny((eventName, ...args) => {
      if (eventName.startsWith('screenshare:')) {
        console.log(`🔔 [SOCKET EVENT] ${eventName}:`, ...args)
      }
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected')
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback)
      if (event.startsWith('screenshare:')) {
        console.log(`📌 [SOCKET] Handler registered for: ${event}`)
      }
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) {
        // 특정 핸들러만 제거
        this.socket.off(event, callback)
        if (event.startsWith('screenshare:')) {
          console.log(`📌 [SOCKET] Handler removed for: ${event} (specific)`)
        }
      } else {
        // 모든 핸들러 제거
        this.socket.off(event)
        if (event.startsWith('screenshare:')) {
          console.log(`📌 [SOCKET] All handlers removed for: ${event}`)
        }
      }
    }
  }

  getSocket() {
    return this.socket
  }
}

export const socketService = new SocketService()
