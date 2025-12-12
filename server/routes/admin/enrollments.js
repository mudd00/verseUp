import express from 'express'
import { authMiddleware, requireAdmin } from '../../middleware/auth.js'
import { supabase } from '../../utils/supabase.js'

const router = express.Router()

router.use(authMiddleware, requireAdmin)

/**
 * GET /api/admin/enrollments
 * 전체 수강 신청 목록
 */
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { page = 1, limit = 20, search = '', status = '' } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let query = supabase
      .from('enrollments')
      .select(
        '*, student:student_id(id, name, email), course:course_id(id, title)',
        { count: 'exact' }
      )

    if (status) {
      query = query.eq('status', status)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1)

    const { data, error, count } = await query

    if (error) throw error

    res.json({
      enrollments: data || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / Number(limit)),
    })
  } catch (error) {
    console.error('수강 목록 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * DELETE /api/admin/enrollments/:id
 * 수강 신청 강제 취소
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params

    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'dropped' })
      .eq('id', id)

    if (error) throw error

    res.json({ message: 'Enrollment cancelled successfully' })
  } catch (error) {
    console.error('수강 취소 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/enrollments/stats
 * 수강 통계
 */
router.get('/stats', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { count: total } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })

    const { count: active } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: dropped } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'dropped')

    res.json({
      total: total || 0,
      active: active || 0,
      dropped: dropped || 0,
      cancellationRate: total > 0 ? ((dropped || 0) / total) * 100 : 0,
    })
  } catch (error) {
    console.error('수강 통계 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

export default router
