import { Router } from 'express'
import { authMiddleware, requireInstructor } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'
import {
  notifyAssignmentCreated,
  notifyAssignmentGraded,
} from '../services/notificationService.js'

const router = Router()

// 모든 라우트에 인증 필요
router.use(authMiddleware)

/**
 * GET /api/courses/:courseId/assignments
 * 특정 강의의 과제 목록 조회
 */
router.get('/courses/:courseId/assignments', async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.user.id

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 권한 확인: 강사, 수강생, 또는 관리자만 조회 가능
    if (req.user.role !== 'admin') {
      const { data: course } = await supabase
        .from('courses')
        .select('instructor_id')
        .eq('id', courseId)
        .single()

      if (!course) {
        return res.status(404).json({ error: 'Course not found' })
      }

      // 강사가 아니면 수강생인지 확인
      if (course.instructor_id !== userId) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('student_id', userId)
          .eq('status', 'active')
          .maybeSingle()

        if (!enrollment) {
          return res
            .status(403)
            .json({ error: 'Only enrolled students can view assignments' })
        }
      }
    }

    // 과제 목록 조회
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date', { ascending: true })

    if (error) throw error

    // 학생인 경우, 각 과제의 제출 여부 확인
    if (req.user.role === 'student') {
      const assignmentIds = assignments.map((a) => a.id)
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status, score, submitted_at')
        .in('assignment_id', assignmentIds)
        .eq('student_id', userId)

      const submissionMap = Object.fromEntries(
        submissions?.map((s) => [s.assignment_id, s]) || []
      )

      assignments.forEach((assignment) => {
        assignment.my_submission = submissionMap[assignment.id] || null
      })
    }

    res.json({ assignments: assignments || [] })
  } catch (error) {
    console.error('Failed to fetch assignments:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/assignments/:id
 * 특정 과제 상세 조회
 */
router.get('/assignments/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 과제 조회
    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    // 권한 확인
    if (req.user.role !== 'admin' && assignment.instructor_id !== userId) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', assignment.course_id)
        .eq('student_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      if (!enrollment) {
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    // 학생인 경우, 자신의 제출 내역 조회
    if (req.user.role === 'student') {
      const { data: submission } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', id)
        .eq('student_id', userId)
        .maybeSingle()

      assignment.my_submission = submission || null
    }

    res.json(assignment)
  } catch (error) {
    console.error('Failed to fetch assignment:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * POST /api/courses/:courseId/assignments
 * 과제 생성 (강사 및 관리자만)
 */
router.post(
  '/courses/:courseId/assignments',
  requireInstructor,
  async (req, res) => {
    try {
      const { courseId } = req.params
      const {
        title,
        description,
        instructions,
        max_score = 100,
        due_date,
        allow_late_submission = false,
        late_penalty_percent = 0,
      } = req.body

      if (!supabase) {
        return res.status(503).json({ error: 'Database service unavailable' })
      }

      // 필수 필드 검증
      if (!title) {
        return res.status(400).json({ error: 'Title is required' })
      }

      // 강사 권한 확인 (관리자는 모든 강의에 과제 생성 가능)
      if (req.user.role !== 'admin') {
        const { data: course } = await supabase
          .from('courses')
          .select('instructor_id')
          .eq('id', courseId)
          .single()

        if (!course) {
          return res.status(404).json({ error: 'Course not found' })
        }

        if (course.instructor_id !== req.user.id) {
          return res
            .status(403)
            .json({ error: 'Only the course instructor can create assignments' })
        }
      }

      // 과제 생성
      const { data: assignment, error } = await supabase
        .from('assignments')
        .insert({
          course_id: courseId,
          instructor_id: req.user.id,
          title,
          description,
          instructions,
          max_score,
          due_date,
          allow_late_submission,
          late_penalty_percent,
        })
        .select()
        .single()

      if (error) throw error

      // 수강생들에게 알림 전송
      try {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('student_id')
          .eq('course_id', courseId)
          .eq('status', 'active')

        const { data: course } = await supabase
          .from('courses')
          .select('title')
          .eq('id', courseId)
          .single()

        for (const enrollment of enrollments || []) {
          await notifyAssignmentCreated(
            enrollment.student_id,
            title,
            course.title,
            assignment.id,
            due_date,
            req.io
          )
        }
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError)
        // 알림 전송 실패해도 과제 생성은 성공으로 처리
      }

      res.status(201).json({ assignment })
    } catch (error) {
      console.error('Failed to create assignment:', error)
      res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }
)

/**
 * PUT /api/assignments/:id
 * 과제 수정 (강사 및 관리자만)
 */
router.put('/assignments/:id', requireInstructor, async (req, res) => {
  try {
    const { id } = req.params
    const {
      title,
      description,
      instructions,
      max_score,
      due_date,
      allow_late_submission,
      late_penalty_percent,
    } = req.body

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 과제 조회 및 권한 확인
    const { data: assignment } = await supabase
      .from('assignments')
      .select('instructor_id')
      .eq('id', id)
      .single()

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    if (req.user.role !== 'admin' && assignment.instructor_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: 'Only the assignment creator can modify it' })
    }

    // 과제 업데이트
    const { data: updated, error } = await supabase
      .from('assignments')
      .update({
        title,
        description,
        instructions,
        max_score,
        due_date,
        allow_late_submission,
        late_penalty_percent,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ assignment: updated })
  } catch (error) {
    console.error('Failed to update assignment:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * DELETE /api/assignments/:id
 * 과제 삭제 (강사 및 관리자만)
 */
router.delete('/assignments/:id', requireInstructor, async (req, res) => {
  try {
    const { id } = req.params

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 과제 조회 및 권한 확인
    const { data: assignment } = await supabase
      .from('assignments')
      .select('instructor_id')
      .eq('id', id)
      .single()

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    if (req.user.role !== 'admin' && assignment.instructor_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: 'Only the assignment creator can delete it' })
    }

    // 과제 삭제 (CASCADE로 제출물도 함께 삭제됨)
    const { error } = await supabase.from('assignments').delete().eq('id', id)

    if (error) throw error

    res.json({ message: 'Assignment deleted successfully' })
  } catch (error) {
    console.error('Failed to delete assignment:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * POST /api/assignments/:id/submit
 * 과제 제출 (학생만)
 */
router.post('/assignments/:id/submit', async (req, res) => {
  try {
    const { id } = req.params
    const { content, file_url, file_name, file_size, file_type } = req.body
    const userId = req.user.id

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 과제 조회
    const { data: assignment } = await supabase
      .from('assignments')
      .select('course_id, due_date, allow_late_submission')
      .eq('id', id)
      .single()

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    // 수강생 확인
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', assignment.course_id)
      .eq('student_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (!enrollment) {
      return res
        .status(403)
        .json({ error: 'Only enrolled students can submit assignments' })
    }

    // 마감일 확인
    const now = new Date()
    const dueDate = new Date(assignment.due_date)
    const isLate = now > dueDate

    if (isLate && !assignment.allow_late_submission) {
      return res.status(400).json({ error: 'Assignment submission deadline has passed' })
    }

    // 제출 (UPSERT - 이미 제출한 경우 업데이트)
    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .upsert(
        {
          assignment_id: id,
          student_id: userId,
          content,
          file_url,
          file_name,
          file_size,
          file_type,
          status: isLate ? 'late' : 'submitted',
        },
        { onConflict: 'assignment_id,student_id' }
      )
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ submission })
  } catch (error) {
    console.error('Failed to submit assignment:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/assignments/:id/submissions
 * 과제 제출 목록 조회 (강사 및 관리자만)
 */
router.get('/assignments/:id/submissions', requireInstructor, async (req, res) => {
  try {
    const { id } = req.params

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 과제 조회 및 권한 확인
    const { data: assignment } = await supabase
      .from('assignments')
      .select('instructor_id')
      .eq('id', id)
      .single()

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    if (req.user.role !== 'admin' && assignment.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // 제출 목록 조회 (학생 정보 포함)
    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select('*, student:student_id(id, name, email)')
      .eq('assignment_id', id)
      .order('submitted_at', { ascending: false })

    if (error) throw error

    res.json({ submissions: submissions || [] })
  } catch (error) {
    console.error('Failed to fetch submissions:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * PUT /api/submissions/:id/grade
 * 과제 채점 (강사 및 관리자만)
 */
router.put('/submissions/:id/grade', requireInstructor, async (req, res) => {
  try {
    const { id } = req.params
    const { score, feedback } = req.body

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 제출물 조회
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('assignment_id, student_id')
      .eq('id', id)
      .single()

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    // 과제 조회 및 권한 확인
    const { data: assignment } = await supabase
      .from('assignments')
      .select('instructor_id, title, max_score')
      .eq('id', submission.assignment_id)
      .single()

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    if (req.user.role !== 'admin' && assignment.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the assignment creator can grade submissions' })
    }

    // 점수 검증
    if (score < 0 || score > assignment.max_score) {
      return res.status(400).json({ error: `Score must be between 0 and ${assignment.max_score}` })
    }

    // 채점
    const { data: graded, error } = await supabase
      .from('assignment_submissions')
      .update({
        score,
        feedback,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: req.user.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 학생에게 알림 전송
    try {
      await notifyAssignmentGraded(
        submission.student_id,
        assignment.title,
        score,
        assignment.max_score,
        submission.assignment_id,
        req.io
      )
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
    }

    res.json({ submission: graded })
  } catch (error) {
    console.error('Failed to grade submission:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

export default router
