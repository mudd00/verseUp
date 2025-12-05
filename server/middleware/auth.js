import { verifySupabaseToken, supabase } from '../utils/supabase.js'

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    const user = await verifySupabaseToken(token)

    // Fetch role from profiles table for accurate role information
    let role = 'student'
    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        role = profile.role
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role,
    }

    next()
  } catch (error) {
    console.error('Auth error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
}

/**
 * Role 기반 권한 확인 미들웨어
 * @param {...string} allowedRoles - 허용된 role 목록
 * @returns {Function} Express 미들웨어
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `이 작업은 ${allowedRoles.join(' 또는 ')} 권한이 필요합니다.`,
      })
    }

    next()
  }
}

/**
 * 강사 또는 관리자 권한 확인 미들웨어
 */
export const requireInstructor = requireRole('instructor', 'admin')

/**
 * 관리자 권한 확인 미들웨어
 */
export const requireAdmin = requireRole('admin')
