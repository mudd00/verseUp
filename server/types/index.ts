export interface User {
  id: string
  email: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Course {
  id: string
  title: string
  description: string
  instructorId: string
  thumbnail?: string
  maxStudents: number
  enrolledCount: number
  startDate: string
  endDate: string
  createdAt: string
}

export interface LiveSession {
  id: string
  courseId: string
  title: string
  description?: string
  scheduledAt: string
  duration: number
  status: 'scheduled' | 'live' | 'ended'
  streamUrl?: string
  recordingUrl?: string
}

export interface SocketUser {
  id: string
  socketId: string
  user: User
  roomId?: string
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: string
  type: 'text' | 'system'
}
