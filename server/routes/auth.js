import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user })
})

router.post('/login', (req, res) => {
  const { email } = req.body

  const mockUser = {
    id: '1',
    email,
    name: 'Test User',
    role: 'student',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const mockToken = 'mock-jwt-token'

  res.json({
    user: mockUser,
    token: mockToken,
  })
})

export default router
