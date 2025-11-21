// API endpoints
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

// WebRTC configuration
export const TURN_SERVER_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // TURN server configuration will be added later
  ],
}

// App constants
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10MB
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:id',
  CREATE_COURSE: '/courses/create',
  LIVE_SESSION: '/session/:id',
  METAVERSE: '/metaverse',
  PROFILE: '/profile',
  ADMIN: '/admin',
} as const
