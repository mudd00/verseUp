import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

// Middleware to require parent role
const requireParent = requireRole('parent')

/**
 * Middleware to validate parent-student link
 */
async function validateParentStudentLink(req, res, next) {
  try {
    const parentId = req.user.id
    const studentId = req.params.studentId

    const { data: link, error } = await supabase
      .from('parent_student_links')
      .select('id, status, student_nickname')
      .eq('parent_id', parentId)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single()

    if (error || !link) {
      return res.status(403).json({
        error: '이 학생의 정보를 조회할 권한이 없습니다.',
      })
    }

    req.parentStudentLink = link
    next()
  } catch (error) {
    console.error('Error validating parent-student link:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * GET /api/parents/children
 * Get list of connected children
 */
router.get('/children', authMiddleware, requireParent, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const parentId = req.user.id

    const { data: links, error } = await supabase
      .from('parent_student_links')
      .select(`
        id,
        student_nickname,
        accepted_at,
        profiles!parent_student_links_student_id_fkey (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('parent_id', parentId)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching children:', error)
      return res.status(500).json({ error: 'Failed to fetch children' })
    }

    // Get stats for each child
    const children = await Promise.all(
      links.map(async (link) => {
        const studentId = link.profiles.id

        // Get active courses count
        const { count: activeCourses } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('status', 'active')

        // Get pending assignments count
        const { count: pendingAssignments } = await supabase
          .from('assignment_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .is('submitted_at', null)

        // Get average grade from submissions
        const { data: grades } = await supabase
          .from('assignment_submissions')
          .select('score')
          .eq('student_id', studentId)
          .not('score', 'is', null)

        const averageGrade =
          grades && grades.length > 0
            ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length * 10) / 10
            : null

        // Get attendance rate (simplified)
        const { data: attendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', studentId)

        const attendanceRate =
          attendance && attendance.length > 0
            ? Math.round(
                (attendance.filter((a) => a.status === 'present' || a.status === 'late').length /
                  attendance.length) *
                  100 *
                  10
              ) / 10
            : null

        return {
          id: link.profiles.id,
          name: link.profiles.name,
          email: link.profiles.email,
          avatarUrl: link.profiles.avatar_url,
          nickname: link.student_nickname,
          linkedAt: link.accepted_at,
          stats: {
            activeCourses: activeCourses || 0,
            pendingAssignments: pendingAssignments || 0,
            averageGrade,
            attendanceRate,
          },
        }
      })
    )

    res.json({ children })
  } catch (error) {
    console.error('Error in get children:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/parents/children/:studentId/nickname
 * Set nickname for a child
 */
router.post(
  '/children/:studentId/nickname',
  authMiddleware,
  requireParent,
  validateParentStudentLink,
  async (req, res) => {
    try {
      const { nickname } = req.body
      const linkId = req.parentStudentLink.id

      const { error } = await supabase
        .from('parent_student_links')
        .update({ student_nickname: nickname })
        .eq('id', linkId)

      if (error) {
        console.error('Error updating nickname:', error)
        return res.status(500).json({ error: 'Failed to update nickname' })
      }

      res.json({ message: '별명이 설정되었습니다.', nickname })
    } catch (error) {
      console.error('Error in set nickname:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * DELETE /api/parents/children/:linkId
 * Disconnect from a child
 */
router.delete('/children/:linkId', authMiddleware, requireParent, async (req, res) => {
  try {
    const { linkId } = req.params
    const parentId = req.user.id

    const { data: link, error: updateError } = await supabase
      .from('parent_student_links')
      .update({ status: 'revoked' })
      .eq('id', linkId)
      .eq('parent_id', parentId)
      .eq('status', 'active')
      .select()
      .single()

    if (updateError || !link) {
      return res.status(404).json({ error: '연결을 찾을 수 없습니다.' })
    }

    console.log(`🔌 Parent ${parentId} disconnected from child via link ${linkId}`)

    res.json({ message: '연결이 해제되었습니다.' })
  } catch (error) {
    console.error('Error in disconnect child:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/parents/children/:studentId/dashboard
 * Get child's dashboard data
 */
router.get(
  '/children/:studentId/dashboard',
  authMiddleware,
  requireParent,
  validateParentStudentLink,
  async (req, res) => {
    try {
      const { studentId } = req.params

      // Get student profile
      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .eq('id', studentId)
        .single()

      if (studentError || !student) {
        return res.status(404).json({ error: 'Student not found' })
      }

      // Get active courses count
      const { count: activeCourses } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'active')

      // Get assignment stats
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('id, submitted_at, score')
        .eq('student_id', studentId)

      const totalAssignments = submissions?.length || 0
      const completedAssignments = submissions?.filter((s) => s.submitted_at).length || 0
      const pendingAssignments = totalAssignments - completedAssignments
      const gradedSubmissions = submissions?.filter((s) => s.score !== null) || []
      const averageGrade =
        gradedSubmissions.length > 0
          ? Math.round(
              (gradedSubmissions.reduce((sum, s) => sum + s.score, 0) / gradedSubmissions.length) * 10
            ) / 10
          : null

      // Get attendance stats
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)

      const attendanceRate =
        attendance && attendance.length > 0
          ? Math.round(
              (attendance.filter((a) => a.status === 'present' || a.status === 'late').length /
                attendance.length) *
                100 *
                10
            ) / 10
          : null

      // Get recent activity (last 5)
      const { data: recentActivity } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          submitted_at,
          score,
          assignments (
            title,
            course_id,
            courses (
              title
            )
          )
        `)
        .eq('student_id', studentId)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(5)

      const formattedActivity = (recentActivity || []).map((item) => ({
        type: 'assignment_submitted',
        title: `${item.assignments?.title || '과제'} 제출`,
        courseName: item.assignments?.courses?.title,
        score: item.score,
        timestamp: item.submitted_at,
      }))

      res.json({
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          avatarUrl: student.avatar_url,
        },
        stats: {
          activeCourses: activeCourses || 0,
          totalAssignments,
          completedAssignments,
          pendingAssignments,
          averageGrade,
          attendanceRate,
        },
        recentActivity: formattedActivity,
      })
    } catch (error) {
      console.error('Error in get dashboard:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * GET /api/parents/children/:studentId/courses
 * Get child's enrolled courses
 */
router.get(
  '/children/:studentId/courses',
  authMiddleware,
  requireParent,
  validateParentStudentLink,
  async (req, res) => {
    try {
      const { studentId } = req.params

      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          enrolled_at,
          courses (
            id,
            title,
            description,
            thumbnail_url,
            weeks,
            start_date,
            end_date,
            instructor_id,
            profiles!courses_instructor_id_fkey (
              id,
              name,
              email
            )
          ),
          course_progress (
            current_week,
            completed_weeks,
            completion_percentage,
            last_activity_at
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')

      if (error) {
        console.error('Error fetching courses:', error)
        return res.status(500).json({ error: 'Failed to fetch courses' })
      }

      // Get attendance rate for each course
      const courses = await Promise.all(
        (enrollments || []).map(async (enrollment) => {
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('status')
            .eq('student_id', studentId)
            .eq('course_id', enrollment.courses.id)

          const attendanceRate =
            attendanceData && attendanceData.length > 0
              ? Math.round(
                  (attendanceData.filter((a) => a.status === 'present' || a.status === 'late')
                    .length /
                    attendanceData.length) *
                    100 *
                    10
                ) / 10
              : null

          // Get average grade for this course
          const { data: submissions } = await supabase
            .from('assignment_submissions')
            .select('score, assignments!inner(course_id)')
            .eq('student_id', studentId)
            .eq('assignments.course_id', enrollment.courses.id)
            .not('score', 'is', null)

          const averageGrade =
            submissions && submissions.length > 0
              ? Math.round(
                  (submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length) * 10
                ) / 10
              : null

          return {
            id: enrollment.courses.id,
            title: enrollment.courses.title,
            description: enrollment.courses.description,
            thumbnailUrl: enrollment.courses.thumbnail_url,
            weeks: enrollment.courses.weeks,
            startDate: enrollment.courses.start_date,
            endDate: enrollment.courses.end_date,
            instructor: {
              id: enrollment.courses.profiles.id,
              name: enrollment.courses.profiles.name,
              email: enrollment.courses.profiles.email,
            },
            progress: enrollment.course_progress?.[0]?.completion_percentage || 0,
            currentWeek: enrollment.course_progress?.[0]?.current_week || 1,
            lastActivity: enrollment.course_progress?.[0]?.last_activity_at,
            attendanceRate,
            averageGrade,
            status: enrollment.status,
            enrolledAt: enrollment.enrolled_at,
          }
        })
      )

      res.json({ courses })
    } catch (error) {
      console.error('Error in get courses:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * GET /api/parents/children/:studentId/assignments
 * Get child's assignments
 */
router.get(
  '/children/:studentId/assignments',
  authMiddleware,
  requireParent,
  validateParentStudentLink,
  async (req, res) => {
    try {
      const { studentId } = req.params
      const { courseId } = req.query

      // Get enrolled courses first
      let enrolledCourseIds = []
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('status', 'active')

      enrolledCourseIds = (enrollments || []).map((e) => e.course_id)

      if (enrolledCourseIds.length === 0) {
        return res.json({ assignments: [] })
      }

      // Filter by courseId if provided
      if (courseId && !enrolledCourseIds.includes(courseId)) {
        return res.status(403).json({ error: '해당 강의에 대한 접근 권한이 없습니다.' })
      }

      const targetCourseIds = courseId ? [courseId] : enrolledCourseIds

      // Get assignments
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          due_date,
          max_score,
          course_id,
          courses (
            id,
            title
          )
        `)
        .in('course_id', targetCourseIds)
        .order('due_date', { ascending: false })

      if (error) {
        console.error('Error fetching assignments:', error)
        return res.status(500).json({ error: 'Failed to fetch assignments' })
      }

      // Get submissions for each assignment
      const assignmentsWithSubmissions = await Promise.all(
        (assignments || []).map(async (assignment) => {
          const { data: submission } = await supabase
            .from('assignment_submissions')
            .select('id, submitted_at, score, feedback')
            .eq('assignment_id', assignment.id)
            .eq('student_id', studentId)
            .single()

          let status = 'pending'
          if (submission?.submitted_at) {
            status = submission.score !== null ? 'graded' : 'submitted'
          } else if (new Date(assignment.due_date) < new Date()) {
            status = 'overdue'
          }

          return {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            dueDate: assignment.due_date,
            maxScore: assignment.max_score,
            course: {
              id: assignment.courses.id,
              title: assignment.courses.title,
            },
            submission: submission
              ? {
                  status,
                  score: submission.score,
                  feedback: submission.feedback,
                  submittedAt: submission.submitted_at,
                }
              : {
                  status,
                  score: null,
                  feedback: null,
                  submittedAt: null,
                },
          }
        })
      )

      res.json({ assignments: assignmentsWithSubmissions })
    } catch (error) {
      console.error('Error in get assignments:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * GET /api/parents/children/:studentId/attendance
 * Get child's attendance records
 */
router.get(
  '/children/:studentId/attendance',
  authMiddleware,
  requireParent,
  validateParentStudentLink,
  async (req, res) => {
    try {
      const { studentId } = req.params
      const { courseId, startDate, endDate } = req.query

      let query = supabase
        .from('attendance')
        .select(`
          id,
          session_date,
          week_number,
          status,
          notes,
          check_in_time,
          course_id,
          courses (
            id,
            title
          )
        `)
        .eq('student_id', studentId)
        .order('session_date', { ascending: false })

      if (courseId) {
        query = query.eq('course_id', courseId)
      }

      if (startDate) {
        query = query.gte('session_date', startDate)
      }

      if (endDate) {
        query = query.lte('session_date', endDate)
      }

      const { data: attendance, error } = await query

      if (error) {
        console.error('Error fetching attendance:', error)
        return res.status(500).json({ error: 'Failed to fetch attendance' })
      }

      // Calculate stats
      const totalSessions = attendance?.length || 0
      const presentCount = attendance?.filter((a) => a.status === 'present').length || 0
      const lateCount = attendance?.filter((a) => a.status === 'late').length || 0
      const absentCount = attendance?.filter((a) => a.status === 'absent').length || 0
      const excusedCount = attendance?.filter((a) => a.status === 'excused').length || 0
      const attendanceRate =
        totalSessions > 0
          ? Math.round(((presentCount + lateCount) / totalSessions) * 100 * 10) / 10
          : null

      const formattedAttendance = (attendance || []).map((record) => ({
        id: record.id,
        sessionDate: record.session_date,
        weekNumber: record.week_number,
        status: record.status,
        notes: record.notes,
        checkInTime: record.check_in_time,
        course: {
          id: record.courses.id,
          title: record.courses.title,
        },
      }))

      res.json({
        attendance: formattedAttendance,
        stats: {
          totalSessions,
          presentCount,
          lateCount,
          absentCount,
          excusedCount,
          attendanceRate,
        },
      })
    } catch (error) {
      console.error('Error in get attendance:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * GET /api/parents/children/:studentId/progress
 * Get child's learning progress
 */
router.get(
  '/children/:studentId/progress',
  authMiddleware,
  requireParent,
  validateParentStudentLink,
  async (req, res) => {
    try {
      const { studentId } = req.params

      const { data: progress, error } = await supabase
        .from('course_progress')
        .select(`
          id,
          current_week,
          completed_weeks,
          total_materials,
          completed_materials,
          completion_percentage,
          last_activity_at,
          total_study_hours,
          course_id,
          courses (
            id,
            title,
            weeks
          )
        `)
        .eq('student_id', studentId)

      if (error) {
        console.error('Error fetching progress:', error)
        return res.status(500).json({ error: 'Failed to fetch progress' })
      }

      const formattedProgress = (progress || []).map((p) => ({
        courseId: p.course_id,
        courseTitle: p.courses.title,
        totalWeeks: p.courses.weeks,
        currentWeek: p.current_week,
        completedWeeks: p.completed_weeks || [],
        totalMaterials: p.total_materials,
        completedMaterials: p.completed_materials,
        completionPercentage: p.completion_percentage,
        lastActivityAt: p.last_activity_at,
        totalStudyHours: p.total_study_hours,
      }))

      res.json({ progress: formattedProgress })
    } catch (error) {
      console.error('Error in get progress:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * GET /api/parents/children/:studentId/location
 * Get child's current location in metaverse
 */
router.get(
  '/children/:studentId/location',
  authMiddleware,
  requireParent,
  validateParentStudentLink,
  async (req, res) => {
    try {
      const { studentId } = req.params

      // This would typically be fetched from a real-time location tracking system
      // For now, we'll return a placeholder structure
      // In production, this should integrate with Socket.IO to get real-time location

      res.json({
        studentId,
        isOnline: false,
        isInClassroom: false,
        classroom: null,
        screenShare: {
          isSharing: false,
          hasConsent: false,
          startedAt: null,
        },
        lastSeen: null,
      })
    } catch (error) {
      console.error('Error in get location:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
