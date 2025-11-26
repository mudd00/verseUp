import { verifySupabaseToken, supabase } from '../utils/supabase.js'

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No authorization header provided')
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    console.log('Verifying token...')
    const user = await verifySupabaseToken(token)
    console.log('Token verified for user:', user.id)

    // Fetch role from profiles table for accurate role information
    let role = 'student'
    if (supabase) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.warn('Profile fetch error (using default role):', profileError.message)
        } else if (profile) {
          role = profile.role
        }
      } catch (profileErr) {
        console.warn('Profile fetch failed (using default role):', profileErr)
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role,
    }

    console.log('Auth middleware passed for user:', req.user.id)
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({ error: 'Invalid token', details: error.message })
  }
}
