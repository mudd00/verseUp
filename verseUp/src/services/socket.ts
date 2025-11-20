import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '@/utils/constants'

class SocketService {
  private socket: Socket | null = null

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket'],
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('error', (error: Error) => {
      console.error('Socket error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  emit(event: string, data?: unknown) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected')
    }
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event: string) {
    if (this.socket) {
      this.socket.off(event)
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }
}

export const socketService = new SocketService()
