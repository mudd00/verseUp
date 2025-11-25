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
