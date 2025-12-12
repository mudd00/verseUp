import express from 'express'
import { authMiddleware, requireAdmin } from '../../middleware/auth.js'
import { supabase } from '../../utils/supabase.js'

const router = express.Router()

// 모든 관리자 라우트에 인증 + 관리자 권한 체크
router.use(authMiddleware, requireAdmin)

/**
 * GET /api/admin/stats/overview
 * 전체 통계 요약
 */
router.get('/overview', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 오늘 날짜 (00:00:00)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 총 사용자 수
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // 총 강의 수 (published 상태)
    const { count: totalCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    // 총 매출
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'DONE')

    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // 오늘 가입한 사용자 수
    const { count: todaySignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    // 오늘 수강 신청
    const { count: todayEnrollments } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    res.json({
      totalUsers: totalUsers || 0,
      totalCourses: totalCourses || 0,
      totalRevenue,
      todaySignups: todaySignups || 0,
      todayEnrollments: todayEnrollments || 0,
    })
  } catch (error) {
    console.error('전체 통계 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/stats/revenue
 * 매출 추이 (일별/주별/월별)
 */
router.get('/revenue', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { period = 'daily' } = req.query

    // TODO: 실제 구현 필요 (기간별 그룹화)
    // 현재는 mock 데이터 반환
    res.json({
      period,
      data: [],
    })
  } catch (error) {
    console.error('매출 추이 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/stats/popular-courses
 * 인기 강의 TOP 10
 */
router.get('/popular-courses', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 수강 신청이 많은 강의 순으로 정렬
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, instructor_id, enrolled_count')
      .eq('status', 'published')
      .order('enrolled_count', { ascending: false })
      .limit(10)

    res.json(courses || [])
  } catch (error) {
    console.error('인기 강의 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/stats/activities
 * 최근 활동 로그
 */
router.get('/activities', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // TODO: 실제 활동 로그 테이블 구현 필요
    // 현재는 빈 배열 반환
    res.json([])
  } catch (error) {
    console.error('활동 로그 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/stats/real-time
 * 실시간 통계 (대시보드용)
 */
router.get('/real-time', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 오늘의 통계
    const { count: todaySignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    const { count: todayEnrollments } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'DONE')
      .gte('created_at', today.toISOString())

    const todayRevenue = todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    res.json({
      todaySignups: todaySignups || 0,
      todayEnrollments: todayEnrollments || 0,
      todayRevenue,
      todayPayments: todayPayments?.length || 0,
    })
  } catch (error) {
    console.error('실시간 통계 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

export default router
