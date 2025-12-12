import express from 'express'
import { authMiddleware, requireAdmin } from '../../middleware/auth.js'
import { supabase } from '../../utils/supabase.js'

const router = express.Router()

// 모든 관리자 라우트에 인증 + 관리자 권한 체크
router.use(authMiddleware, requireAdmin)

/**
 * GET /api/admin/users
 * 전체 사용자 목록 조회 (페이지네이션, 검색, 필터)
 */
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { page = 1, limit = 20, search = '', role = '' } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    // 기본 쿼리
    let query = supabase.from('profiles').select('*', { count: 'exact' })

    // 검색 조건 (이름 또는 이메일)
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // 역할 필터
    if (role) {
      query = query.eq('role', role)
    }

    // 정렬 (최신 가입 순)
    query = query.order('created_at', { ascending: false })

    // 페이지네이션
    query = query.range(offset, offset + Number(limit) - 1)

    const { data, error, count } = await query

    if (error) throw error

    res.json({
      users: data || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / Number(limit)),
    })
  } catch (error) {
    console.error('사용자 목록 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/users/stats
 * 사용자 통계
 */
router.get('/stats', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 전체 사용자 수
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // 역할별 사용자 수
    const { data: roleStats } = await supabase
      .from('profiles')
      .select('role')

    const roleDistribution = {
      student: 0,
      instructor: 0,
      admin: 0,
    }

    roleStats?.forEach((user) => {
      if (user.role in roleDistribution) {
        roleDistribution[user.role]++
      }
    })

    // 오늘 가입한 사용자 수
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todaySignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    res.json({
      totalUsers: totalUsers || 0,
      roleDistribution,
      todaySignups: todaySignups || 0,
    })
  } catch (error) {
    console.error('사용자 통계 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/users/:id
 * 특정 사용자 상세 정보 조회
 */
router.get('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // 사용자가 학생인 경우 수강 내역 조회
    if (user.role === 'student') {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', id)

      user.enrollments = enrollments || []
    }

    // 사용자가 강사인 경우 개설 강의 조회
    if (user.role === 'instructor') {
      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', id)

      user.courses = courses || []
    }

    res.json(user)
  } catch (error) {
    console.error('사용자 상세 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * PUT /api/admin/users/:id/status
 * 사용자 계정 상태 변경 (활성화/비활성화)
 */
router.put('/:id/status', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params
    const { active } = req.body

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active must be a boolean' })
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ message: 'User status updated', user: data })
  } catch (error) {
    console.error('사용자 상태 변경 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

export default router
