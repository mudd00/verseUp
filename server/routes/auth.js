import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

// Get current user with profile data
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!supabase || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Fetch user profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        avatarUrl: profile.avatar_url,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

// Delete user account
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    if (!supabase) {
      console.error('Supabase client not available')
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const userId = req.user.id
    console.log(`🗑️  Attempting to delete user account: ${userId}`)

    // Delete user using Supabase Admin API
    const { data, error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      console.error('❌ Error deleting user from Supabase Auth:', error)
      return res.status(500).json({
        error: 'Failed to delete account',
        details: error.message
      })
    }

    console.log('✅ User account deleted successfully:', userId)
    res.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    console.error('❌ Unexpected error deleting account:', error)
    res.status(500).json({
      error: 'Failed to delete account',
      details: error.message
    })
  }
})

export default router
