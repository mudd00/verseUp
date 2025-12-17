import express from 'express'
import { authMiddleware, requireAdmin } from '../../middleware/auth.js'
import { supabase } from '../../utils/supabase.js'
import {
  notifyCourseApproved,
  notifyCourseRejected,
} from '../../services/notificationService.js'

const router = express.Router()

// 모든 관리자 라우트에 인증 + 관리자 권한 체크
router.use(authMiddleware, requireAdmin)

/**
 * GET /api/admin/courses
 * 전체 강의 목록 조회 (페이지네이션, 검색, 필터)
 */
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { page = 1, limit = 20, search = '', status = '' } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    // 기본 쿼리 - 강사 정보 포함
    let query = supabase
      .from('courses')
      .select('*, instructor:instructor_id(id, name, email)', { count: 'exact' })

    // 검색 조건 (강의명 또는 강사명)
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // 상태 필터
    if (status) {
      query = query.eq('status', status)
    }

    // 정렬 (최신 생성 순)
    query = query.order('created_at', { ascending: false })

    // 페이지네이션
    query = query.range(offset, offset + Number(limit) - 1)

    const { data, error, count } = await query

    if (error) throw error

    res.json({
      courses: data || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / Number(limit)),
    })
  } catch (error) {
    console.error('강의 목록 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/courses/stats
 * 강의 통계
 */
router.get('/stats', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 전체 강의 수
    const { count: totalCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })

    // 상태별 강의 수
    const { data: statusStats } = await supabase.from('courses').select('status')

    const statusDistribution = {
      draft: 0,
      published: 0,
      archived: 0,
    }

    statusStats?.forEach((course) => {
      if (course.status in statusDistribution) {
        statusDistribution[course.status]++
      }
    })

    // 카테고리별 강의 수
    const { data: categoryStats } = await supabase
      .from('courses')
      .select('category')

    const categoryDistribution = {}
    categoryStats?.forEach((course) => {
      const category = course.category || 'uncategorized'
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1
    })

    res.json({
      totalCourses: totalCourses || 0,
      statusDistribution,
      categoryDistribution,
    })
  } catch (error) {
    console.error('강의 통계 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/courses/:id
 * 특정 강의 상세 정보 조회 (수강생 포함)
 */
router.get('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params

    // 강의 정보 조회
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*, instructor:instructor_id(id, name, email)')
      .eq('id', id)
      .single()

    if (courseError) throw courseError
    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    // 수강생 목록 조회
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, student:student_id(id, name, email)')
      .eq('course_id', id)

    course.enrollments = enrollments || []

    res.json(course)
  } catch (error) {
    console.error('강의 상세 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * PUT /api/admin/courses/:id/status
 * 강의 상태 변경 (승인/거부/아카이브)
 */
router.put('/:id/status', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params
    const { status, reason = '' } = req.body

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be draft, published, or archived',
      })
    }

    // 강의 상태 업데이트
    const { data, error } = await supabase
      .from('courses')
      .update({
        status,
        updated_at: new Date().toISOString(),
        // 거부 사유가 있으면 메타데이터에 저장 (필요시 별도 테이블 생성)
        ...(reason && { rejection_reason: reason }),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return res.status(404).json({ error: 'Course not found' })
    }

    // 강사에게 알림 전송
    try {
      if (status === 'published') {
        await notifyCourseApproved(
          data.instructor_id,
          data.title,
          data.id,
          req.io
        )
      } else if (status === 'archived' && reason) {
        await notifyCourseRejected(
          data.instructor_id,
          data.title,
          data.id,
          reason,
          req.io
        )
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
      // 알림 전송 실패해도 강의 상태 변경은 성공으로 처리
    }

    res.json({ message: 'Course status updated', course: data })
  } catch (error) {
    console.error('강의 상태 변경 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * DELETE /api/admin/courses/:id
 * 강의 강제 삭제
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params

    // 수강생이 있는지 확인
    const { count: enrollmentCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id)

    if (enrollmentCount && enrollmentCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete course with enrolled students',
        enrollmentCount,
      })
    }

    // 강의 삭제 (CASCADE로 관련 데이터도 삭제됨)
    const { error } = await supabase.from('courses').delete().eq('id', id)

    if (error) throw error

    res.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('강의 삭제 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

export default router
