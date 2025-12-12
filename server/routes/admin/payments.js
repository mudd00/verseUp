import express from 'express'
import { authMiddleware, requireAdmin } from '../../middleware/auth.js'
import { supabase } from '../../utils/supabase.js'

const router = express.Router()

router.use(authMiddleware, requireAdmin)

/**
 * GET /api/admin/payments
 * 전체 결제 내역
 */
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { page = 1, limit = 20, search = '' } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    // payments 조회 (course 조인)
    let query = supabase
      .from('payments')
      .select('*, course:courses!course_id(id, title, course_code)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1)

    const { data: payments, error, count } = await query

    if (error) throw error

    // user_id로 profiles 조회
    const userIds = [...new Set(payments?.map((p) => p.user_id).filter(Boolean))]
    let profiles = []
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)
      profiles = data || []
    }

    // profiles를 map으로 변환
    const profilesMap = {}
    profiles.forEach((profile) => {
      profilesMap[profile.id] = profile
    })

    // payments에 user 정보 추가
    const paymentsWithUser = payments?.map((payment) => ({
      ...payment,
      user: profilesMap[payment.user_id] || null,
    }))

    res.json({
      payments: paymentsWithUser || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / Number(limit)),
    })
  } catch (error) {
    console.error('결제 목록 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/refunds
 * 전체 환불 내역
 */
router.get('/refunds', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // refunds 조회 (course 조인)
    const { data: refunds, error } = await supabase
      .from('refunds')
      .select('*, course:courses!course_id(id, title, course_code)')
      .order('created_at', { ascending: false })

    if (error) throw error

    // user_id로 profiles 조회
    const userIds = [...new Set(refunds?.map((r) => r.user_id).filter(Boolean))]
    let profiles = []
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)
      profiles = data || []
    }

    // profiles를 map으로 변환
    const profilesMap = {}
    profiles.forEach((profile) => {
      profilesMap[profile.id] = profile
    })

    // refunds에 user 정보 추가
    const refundsWithUser = refunds?.map((refund) => ({
      ...refund,
      user: profilesMap[refund.user_id] || null,
    }))

    res.json({ refunds: refundsWithUser || [] })
  } catch (error) {
    console.error('환불 목록 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * POST /api/admin/refunds/:id/approve
 * 환불 승인
 */
router.post('/refunds/:id/approve', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params

    const { error } = await supabase
      .from('refunds')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    res.json({ message: 'Refund approved successfully' })
  } catch (error) {
    console.error('환불 승인 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * POST /api/admin/refunds/:id/reject
 * 환불 거부
 */
router.post('/refunds/:id/reject', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params

    const { error } = await supabase
      .from('refunds')
      .update({ status: 'rejected' })
      .eq('id', id)

    if (error) throw error

    res.json({ message: 'Refund rejected successfully' })
  } catch (error) {
    console.error('환불 거부 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/payments/stats
 * 결제/환불 통계
 */
router.get('/stats', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, status')

    const { data: refunds } = await supabase.from('refunds').select('amount, status')

    const totalRevenue =
      payments
        ?.filter((p) => p.status === 'DONE')
        .reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    const totalRefunded =
      refunds
        ?.filter((r) => r.status === 'approved')
        .reduce((sum, r) => sum + (r.amount || 0), 0) || 0

    res.json({
      totalRevenue,
      totalRefunded,
      netRevenue: totalRevenue - totalRefunded,
      refundRate: totalRevenue > 0 ? (totalRefunded / totalRevenue) * 100 : 0,
    })
  } catch (error) {
    console.error('결제 통계 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

export default router
