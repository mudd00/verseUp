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
      .gte('enrolled_at', today.toISOString())

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

    // 기간 설정
    const now = new Date()
    let startDate = new Date()
    let dateFormat = ''

    if (period === 'daily') {
      startDate.setDate(now.getDate() - 14) // 최근 14일
      dateFormat = 'YYYY-MM-DD'
    } else if (period === 'weekly') {
      startDate.setDate(now.getDate() - 84) // 최근 12주
      dateFormat = 'YYYY-WW'
    } else if (period === 'monthly') {
      startDate.setMonth(now.getMonth() - 12) // 최근 12개월
      dateFormat = 'YYYY-MM'
    }

    // 결제 데이터 조회
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, created_at')
      .eq('status', 'DONE')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // 기간별로 그룹화
    const revenueMap = {}
    payments?.forEach((payment) => {
      const date = new Date(payment.created_at)
      let key = ''

      if (period === 'daily') {
        key = date.toISOString().split('T')[0] // YYYY-MM-DD
      } else if (period === 'weekly') {
        const week = Math.ceil((date.getDate() + 6 - date.getDay()) / 7)
        key = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }

      if (!revenueMap[key]) {
        revenueMap[key] = 0
      }
      revenueMap[key] += payment.amount || 0
    })

    // 배열로 변환
    const revenue = Object.entries(revenueMap).map(([date, amount]) => ({
      date,
      revenue: amount,
    }))

    res.json({ revenue })
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
      .select('id, title, course_code, instructor_id, enrolled_count')
      .eq('status', 'published')
      .order('enrolled_count', { ascending: false })
      .limit(10)

    res.json({ courses: courses || [] })
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

    const activities = []

    // 최근 가입자 (최근 10명)
    const { data: recentSignups } = await supabase
      .from('profiles')
      .select('name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    recentSignups?.forEach((user) => {
      activities.push({
        type: 'signup',
        description: `${user.name}님이 가입했습니다.`,
        created_at: user.created_at,
      })
    })

    // 최근 수강 신청 (최근 10건)
    const { data: recentEnrollments } = await supabase
      .from('enrollments')
      .select('enrolled_at, student:profiles!student_id(name), course:courses!course_id(title)')
      .order('enrolled_at', { ascending: false })
      .limit(5)

    recentEnrollments?.forEach((enrollment) => {
      const studentName = enrollment.student?.name || '알 수 없음'
      const courseTitle = enrollment.course?.title || '알 수 없음'
      activities.push({
        type: 'enrollment',
        description: `${studentName}님이 "${courseTitle}" 강의를 신청했습니다.`,
        created_at: enrollment.enrolled_at,
      })
    })

    // 최근 결제 (최근 10건)
    const { data: recentPayments } = await supabase
      .from('payments')
      .select('created_at, amount, order_name')
      .eq('status', 'DONE')
      .order('created_at', { ascending: false })
      .limit(5)

    recentPayments?.forEach((payment) => {
      activities.push({
        type: 'payment',
        description: `${payment.order_name || '강의'} 결제가 완료되었습니다. (₩${(payment.amount || 0).toLocaleString()})`,
        created_at: payment.created_at,
      })
    })

    // 시간순으로 정렬 (최신순)
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // 최대 15개로 제한
    res.json({ activities: activities.slice(0, 15) })
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
      .gte('enrolled_at', today.toISOString())

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
