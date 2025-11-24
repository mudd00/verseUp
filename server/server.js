import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { setupSocketHandlers } from './sockets/index.js'
import apiRoutes from './routes/index.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})

const PORT = process.env.PORT || 3000

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api', apiRoutes)
setupSocketHandlers(io)

app.use((err, req, res, _next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  console.log(`🔌 Socket.IO ready`)
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`)
})

export { io }
