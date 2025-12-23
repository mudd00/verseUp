import { io } from 'socket.io-client'
import { SOCKET_URL } from '@/utils/constants.js'

class SocketService {
  constructor() {
    this.socket = null
    this.pendingListeners = [] // 소켓 연결 전에 등록된 리스너들
  }

  connect(token) {
    // 소켓이 이미 존재하면 (연결 중이든 연결됐든) 기존 소켓 반환
    if (this.socket) {
      return this.socket
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      // WebSocket 우선, HTTP long-polling 폴백 (네트워크 안정성)
      transports: ['websocket', 'polling'],
      // 재연결 설정
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // 타임아웃 설정
      timeout: 20000,
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)

      // 소켓 연결 후 대기 중인 리스너들 등록
      if (this.pendingListeners.length > 0) {
        console.log(`📌 [SOCKET] (on connect) Registering ${this.pendingListeners.length} pending listeners`)
        this.pendingListeners.forEach(({ event, callback }) => {
          console.log(`📌 [SOCKET] (on connect) Registering: ${event}`)
          this.socket.on(event, callback)
        })
        this.pendingListeners = []
      }
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    // Debug: Log all incoming events
    this.socket.onAny((eventName, ...args) => {
      console.log(`🔔 [SOCKET EVENT] ${eventName}:`, ...args)
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
      // 소켓이 존재하면 바로 등록 (연결 여부 무관 - Socket.IO가 내부적으로 처리)
      console.log(`📌 [SOCKET] Registering handler for: ${event}`)
      this.socket.on(event, callback)
    } else {
      // 소켓이 없으면 대기열에 추가
      console.log(`📌 [SOCKET] Queuing handler for: ${event} (no socket)`)
      this.pendingListeners.push({ event, callback })
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) {
        // 특정 핸들러만 제거
        this.socket.off(event, callback)
        if (event.startsWith('screenshare:') || event.startsWith('chat:') || event.startsWith('location:')) {
          console.log(`📌 [SOCKET] Handler removed for: ${event} (specific)`)
        }
      } else {
        // 모든 핸들러 제거
        this.socket.off(event)
        if (event.startsWith('screenshare:') || event.startsWith('chat:') || event.startsWith('location:')) {
          console.log(`📌 [SOCKET] All handlers removed for: ${event}`)
        }
      }
    }
    // 대기열에서도 제거
    if (callback) {
      this.pendingListeners = this.pendingListeners.filter(
        (l) => !(l.event === event && l.callback === callback)
      )
    } else {
      this.pendingListeners = this.pendingListeners.filter((l) => l.event !== event)
    }
  }

  getSocket() {
    return this.socket
  }
}

export const socketService = new SocketService()
export const socket = socketService
