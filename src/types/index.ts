// User types
export interface User {
  id: string
  email: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

// Session/Course types
export interface Course {
  id: string
  title: string
  description: string
  instructorId: string
  instructor?: User
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

// Auth types
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// WebRTC types
export interface PeerConnection {
  userId: string
  connection: RTCPeerConnection
  stream?: MediaStream
}

// Chat types
export interface ChatMessage {
  id: string
  userId: string
  user: User
  message: string
  timestamp: string
  type: 'text' | 'system'
}
