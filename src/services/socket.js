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

  // 소켓 연결을 기다리는 헬퍼 메서드
  waitForConnection(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket)
        return
      }

      if (!this.socket) {
        reject(new Error('Socket not initialized'))
        return
      }

      const timer = setTimeout(() => {
        reject(new Error('Socket connection timeout'))
      }, timeout)

      this.socket.once('connect', () => {
        clearTimeout(timer)
        resolve(this.socket)
      })
    })
  }

  async emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn(`Socket not connected, waiting for connection to emit: ${event}`)
      try {
        await this.waitForConnection()
        this.socket.emit(event, data)
        console.log(`✅ Successfully emitted ${event} after waiting for connection`)
      } catch (error) {
        console.error(`❌ Failed to emit ${event}:`, error.message)
      }
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
export const socket = socketService
