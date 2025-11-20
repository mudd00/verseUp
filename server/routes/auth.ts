import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ user: req.user })
})

// Mock login (replace with actual Supabase auth)
router.post('/login', (req, res) => {
  const { email, password } = req.body

  // TODO: Implement actual authentication with Supabase
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
