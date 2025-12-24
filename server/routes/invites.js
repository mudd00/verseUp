import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

/**
 * POST /api/invites/generate
 * Generate a new parent invite code (student only)
 */
router.post('/generate', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const studentId = req.user.id

    // Check for existing pending invite codes (limit to prevent abuse)
    const { data: existingInvites, error: checkError } = await supabase
      .from('parent_student_links')
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'pending')

    if (checkError) {
      console.error('Error checking existing invites:', checkError)
      return res.status(500).json({ error: 'Failed to check existing invites' })
    }

    if (existingInvites && existingInvites.length >= 3) {
      return res.status(400).json({
        error: '대기 중인 초대 코드가 이미 3개 있습니다. 기존 코드를 취소한 후 다시 시도해주세요.',
      })
    }

    // Generate invite code using database function
    const { data: codeData, error: codeError } = await supabase.rpc('generate_invite_code')

    if (codeError) {
      console.error('Error generating invite code:', codeError)
      return res.status(500).json({ error: 'Failed to generate invite code' })
    }

    const inviteCode = codeData

    // Calculate expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invite record
    const { data: invite, error: insertError } = await supabase
      .from('parent_student_links')
      .insert({
        student_id: studentId,
        invite_code: inviteCode,
        status: 'pending',
        code_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating invite:', insertError)
      return res.status(500).json({ error: 'Failed to create invite' })
    }

    console.log(`📨 Invite code generated: ${inviteCode} for student ${studentId}`)

    res.status(201).json({
      inviteCode: invite.invite_code,
      expiresAt: invite.code_expires_at,
      studentId: invite.student_id,
    })
  } catch (error) {
    console.error('Error in generate invite:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/invites/validate
 * Validate an invite code (public - for parent registration)
 */
router.post('/validate', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { inviteCode } = req.body

    if (!inviteCode) {
      return res.status(400).json({ error: '초대 코드를 입력해주세요.' })
    }

    // Find the invite code
    const { data: invite, error } = await supabase
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

    if (error || !invite) {
      return res.status(404).json({
        valid: false,
        error: '유효하지 않은 초대 코드입니다.',
      })
    }

    // Check if already used
    if (invite.status === 'active') {
      return res.status(400).json({
        valid: false,
        error: '이미 사용된 초대 코드입니다.',
      })
    }

    // Check if revoked
    if (invite.status === 'revoked') {
      return res.status(400).json({
        valid: false,
        error: '취소된 초대 코드입니다.',
      })
    }

    // Check if expired
    if (new Date(invite.code_expires_at) < new Date()) {
      return res.status(400).json({
        valid: false,
        error: '만료된 초대 코드입니다.',
      })
    }

    res.json({
      valid: true,
      student: {
        id: invite.profiles.id,
        name: invite.profiles.name,
        email: invite.profiles.email,
      },
      expiresAt: invite.code_expires_at,
    })
  } catch (error) {
    console.error('Error validating invite:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/invites/my
 * Get my created invite codes (student only)
 */
router.get('/my', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const studentId = req.user.id

    const { data: invites, error } = await supabase
      .from('parent_student_links')
      .select(`
        id,
        invite_code,
        status,
        code_expires_at,
        accepted_at,
        created_at,
        parent_id,
        profiles!parent_student_links_parent_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invites:', error)
      return res.status(500).json({ error: 'Failed to fetch invites' })
    }

    const formattedInvites = invites.map((invite) => ({
      id: invite.id,
      inviteCode: invite.invite_code,
      status: invite.status,
      expiresAt: invite.code_expires_at,
      acceptedAt: invite.accepted_at,
      createdAt: invite.created_at,
      parent: invite.profiles
        ? {
            id: invite.profiles.id,
            name: invite.profiles.name,
            email: invite.profiles.email,
          }
        : null,
    }))

    res.json({ invites: formattedInvites })
  } catch (error) {
    console.error('Error in get my invites:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/invites/:code
 * Revoke an invite code (student only)
 */
router.delete('/:code', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { code } = req.params
    const studentId = req.user.id

    // Find the invite
    const { data: invite, error: findError } = await supabase
      .from('parent_student_links')
      .select('id, status')
      .eq('invite_code', code.toUpperCase())
      .eq('student_id', studentId)
      .single()

    if (findError || !invite) {
      return res.status(404).json({ error: '초대 코드를 찾을 수 없습니다.' })
    }

    if (invite.status === 'active') {
      return res.status(400).json({
        error: '이미 사용된 초대 코드는 취소할 수 없습니다. 연결 해제를 이용해주세요.',
      })
    }

    // Update status to revoked
    const { error: updateError } = await supabase
      .from('parent_student_links')
      .update({ status: 'revoked' })
      .eq('id', invite.id)

    if (updateError) {
      console.error('Error revoking invite:', updateError)
      return res.status(500).json({ error: 'Failed to revoke invite' })
    }

    console.log(`🚫 Invite code revoked: ${code} by student ${studentId}`)

    res.json({ message: '초대 코드가 취소되었습니다.' })
  } catch (error) {
    console.error('Error in revoke invite:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/invites/connected-parents
 * Get connected parents (student only)
 */
router.get('/connected-parents', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const studentId = req.user.id

    const { data: links, error } = await supabase
      .from('parent_student_links')
      .select(`
        id,
        accepted_at,
        profiles!parent_student_links_parent_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching connected parents:', error)
      return res.status(500).json({ error: 'Failed to fetch connected parents' })
    }

    const parents = links
      .filter((link) => link.profiles)
      .map((link) => ({
        linkId: link.id,
        id: link.profiles.id,
        name: link.profiles.name,
        email: link.profiles.email,
        connectedAt: link.accepted_at,
      }))

    res.json({ parents })
  } catch (error) {
    console.error('Error in get connected parents:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/invites/disconnect/:linkId
 * Disconnect a parent (student only)
 */
router.delete('/disconnect/:linkId', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { linkId } = req.params
    const studentId = req.user.id

    // Verify ownership and update
    const { data: link, error: updateError } = await supabase
      .from('parent_student_links')
      .update({ status: 'revoked' })
      .eq('id', linkId)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .select()
      .single()

    if (updateError || !link) {
      return res.status(404).json({ error: '연결을 찾을 수 없습니다.' })
    }

    console.log(`🔌 Parent disconnected: link ${linkId} by student ${studentId}`)

    res.json({ message: '부모 연결이 해제되었습니다.' })
  } catch (error) {
    console.error('Error in disconnect parent:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
