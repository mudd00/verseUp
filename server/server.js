import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupSocketHandlers } from './sockets/index.js'
import apiRoutes from './routes/index.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 환경 변수 검증
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET']
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingEnvVars.forEach((varName) => {
    console.error(`   - ${varName}`)
  })
  console.error('\n💡 Please check your .env file and ensure all required variables are set.')
  process.exit(1)
}

const app = express()
const httpServer = createServer(app)

// CORS 설정 (여러 origin 지원)
const getAllowedOrigins = () => {
  const origins = process.env.CORS_ORIGIN || 'http://localhost:5173'
  // 쉼표로 구분된 여러 origin 지원
  return origins.split(',').map(o => o.trim())
}

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins()
    // origin이 없으면 (같은 도메인 요청) 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // 프로덕션에서는 허용되지 않은 origin 거부
      if (process.env.NODE_ENV === 'production') {
        console.warn(`⚠️ CORS rejected origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      } else {
        // 개발 환경에서만 모든 origin 허용
        console.warn(`⚠️ CORS allowing unknown origin (dev mode): ${origin}`)
        callback(null, true)
      }
    }
  },
  credentials: true,
}

const io = new Server(httpServer, {
  cors: corsOptions,
  // WebSocket과 HTTP long-polling 모두 지원 (안정성 향상)
  transports: ['websocket', 'polling'],
  // 연결 안정성 설정
  pingTimeout: 60000,
  pingInterval: 25000,
})

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0' // 외부 접속을 위해 0.0.0.0 바인딩

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Attach Socket.IO instance to req object
app.use((req, _res, next) => {
  req.io = io
  next()
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api', apiRoutes)
setupSocketHandlers(io)

// 프로덕션에서 정적 파일 서빙 (Vite 빌드 결과물)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))

  // SPA 라우팅: 모든 비-API 요청을 index.html로 리다이렉트
  // Express 5에서는 '*' 대신 '{*path}' 사용
  app.get('/{*path}', (req, res, next) => {
    // API, Socket.IO, health 엔드포인트는 제외
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path === '/health') {
      return next()
    }
    // 정적 파일 요청은 제외 (이미 express.static에서 처리됨, 없으면 404)
    const staticExtensions = ['.js', '.css', '.map', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.glb', '.gltf', '.fbx']
    if (staticExtensions.some(ext => req.path.endsWith(ext))) {
      return res.status(404).send('Not found')
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })

  console.log('📦 Serving static files from:', distPath)
}

app.use((err, req, res, _next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

httpServer.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`)
  console.log(`🔌 Socket.IO ready (transports: websocket, polling)`)
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`)
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export { io }
