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

// 강의 시간표 타입
export interface CourseSchedule {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=일요일, 1=월요일, ..., 6=토요일
  startTime: string // "HH:mm" 형식 (예: "14:00")
  endTime: string // "HH:mm" 형식 (예: "16:00")
}

// Session/Course types
export interface Course {
  id: string
  courseCode: string
  title: string
  description: string
  instructorId: string
  instructor?: User
  thumbnail?: string
  maxStudents: number
  enrolledCount: number
  startDate: string
  endDate: string
  schedule?: CourseSchedule[] // 주간 시간표
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  status?: 'draft' | 'published' | 'archived'
  price?: number
  createdAt: string
  updatedAt?: string
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
