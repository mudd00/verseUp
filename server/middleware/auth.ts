import { Request, Response, NextFunction } from 'express'
import { verifySupabaseToken } from '../utils/supabase.js'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email?: string
    role?: string
  }
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    const user = await verifySupabaseToken(token)

    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'student',
    }

    next()
  } catch (error) {
    console.error('Auth error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
}
