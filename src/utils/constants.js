// API endpoints
// 프로덕션에서는 빈 문자열이면 같은 도메인 사용 (상대 경로)
const apiUrl = import.meta.env.VITE_API_URL
const socketUrl = import.meta.env.VITE_SOCKET_URL

export const API_BASE_URL = apiUrl || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')
export const SOCKET_URL = socketUrl || (import.meta.env.PROD ? '' : 'http://localhost:3000')

// WebRTC configuration
export const TURN_SERVER_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // TURN server configuration will be added later
  ],
}

// App constants
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10MB
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']

// Course categories
export const COURSE_CATEGORIES = {
  programming: '프로그래밍',
  web_development: '웹 개발',
  data_science: '데이터 과학',
  design: '디자인',
  business: '비즈니스',
  marketing: '마케팅',
  language: '외국어',
  general: '기타',
}

// Course levels
export const COURSE_LEVELS = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

// Route paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:id',
  CREATE_COURSE: '/courses/create',
  MY_COURSES: '/my-courses',
  LIVE_SESSION: '/session/:id',
  METAVERSE: '/metaverse',
  PROFILE: '/profile',
  ADMIN: '/admin',
}
