import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

/**
 * POST /api/auth/register-parent
 * Register a new parent account using invite code
 */
router.post('/register-parent', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { inviteCode, name, email, password } = req.body

    // Validate input
    if (!inviteCode || !name || !email || !password) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' })
    }

    // Find and validate invite code
    const { data: invite, error: inviteError } = await supabase
      .from('parent_student_links')
      .select(`
        id,
        student_id,
        status,
        code_expires_at,
        profiles!parent_student_links_student_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (inviteError || !invite) {
      return res.status(404).json({ error: '유효하지 않은 초대 코드입니다.' })
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: '이미 사용되었거나 취소된 초대 코드입니다.' })
    }

    if (new Date(invite.code_expires_at) < new Date()) {
      return res.status(400).json({ error: '만료된 초대 코드입니다.' })
    }

    // Create Supabase auth user with parent role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'parent',
      },
    })

    if (authError) {
      console.error('Error creating parent user:', authError)
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ error: '이미 등록된 이메일입니다.' })
      }
      return res.status(500).json({ error: '계정 생성에 실패했습니다.' })
    }

    const parentId = authData.user.id

    // Update invite link to active
    const { error: updateError } = await supabase
      .from('parent_student_links')
      .update({
        parent_id: parentId,
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('Error updating invite link:', updateError)
      // Rollback: delete the created user
      await supabase.auth.admin.deleteUser(parentId)
      return res.status(500).json({ error: '연결 설정에 실패했습니다.' })
    }

    // Generate session token for the new parent
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error('Error signing in new parent:', signInError)
      // User created but couldn't sign in, still return success
      return res.status(201).json({
        message: '부모 계정이 생성되었습니다. 로그인해주세요.',
        user: {
          id: parentId,
          email,
          name,
          role: 'parent',
        },
        student: {
          id: invite.profiles.id,
          name: invite.profiles.name,
        },
      })
    }

    console.log(`👨‍👩‍👧 Parent registered: ${email} linked to student ${invite.student_id}`)

    res.status(201).json({
      user: {
        id: parentId,
        email,
        name,
        role: 'parent',
      },
      token: signInData.session.access_token,
      student: {
        id: invite.profiles.id,
        name: invite.profiles.name,
      },
    })
  } catch (error) {
    console.error('Error in register-parent:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

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
