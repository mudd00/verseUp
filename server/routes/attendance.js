import express from 'express'
import { authMiddleware, requireInstructor } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

/**
 * GET /api/attendance/course/:courseId
 * Get all attendance records for a course (instructor only)
 */
router.get('/course/:courseId', requireInstructor, async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.user.id

    // Verify instructor owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, instructor_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' })
    }

    if (course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 강의의 출석을 조회할 권한이 없습니다.' })
    }

    // Get attendance records with student info
    const { data: attendance, error } = await supabase
      .from('attendance')
      .select(`
        *,
        student:profiles!attendance_student_id_fkey(id, name, email)
      `)
      .eq('course_id', courseId)
      .order('session_date', { ascending: false })
      .order('student_id')

    if (error) throw error

    res.json({ attendance })
  } catch (error) {
    console.error('Get course attendance error:', error)
    res.status(500).json({ error: '출석 정보 조회에 실패했습니다.' })
  }
})

/**
 * GET /api/attendance/course/:courseId/session/:date
 * Get attendance for a specific session date
 */
router.get('/course/:courseId/session/:date', requireInstructor, async (req, res) => {
  try {
    const { courseId, date } = req.params
    const userId = req.user.id

    // Verify instructor owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, instructor_id, title')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' })
    }

    if (course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 강의의 출석을 조회할 권한이 없습니다.' })
    }

    // Get enrolled students
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        student:profiles!enrollments_student_id_fkey(id, name, email)
      `)
      .eq('course_id', courseId)
      .eq('status', 'active')

    if (enrollError) throw enrollError

    // Get existing attendance for this date
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('course_id', courseId)
      .eq('session_date', date)

    if (attendanceError) throw attendanceError

    // Map attendance to students
    const attendanceMap = new Map(attendance.map((a) => [a.student_id, a]))

    const studentsWithAttendance = enrollments.map((e) => ({
      student: e.student,
      attendance: attendanceMap.get(e.student_id) || null,
    }))

    res.json({
      course: { id: course.id, title: course.title },
      date,
      students: studentsWithAttendance,
    })
  } catch (error) {
    console.error('Get session attendance error:', error)
    res.status(500).json({ error: '출석 정보 조회에 실패했습니다.' })
  }
})

/**
 * GET /api/attendance/course/:courseId/students
 * Get enrolled students for a course (for attendance taking)
 */
router.get('/course/:courseId/students', requireInstructor, async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.user.id

    // Verify instructor owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, instructor_id, title')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' })
    }

    if (course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 강의의 학생 목록을 조회할 권한이 없습니다.' })
    }

    // Get enrolled students
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        student_id,
        enrolled_at,
        student:profiles!enrollments_student_id_fkey(id, name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: true })

    if (error) throw error

    res.json({
      course: { id: course.id, title: course.title },
      students: enrollments.map((e) => ({
        ...e.student,
        enrolledAt: e.enrolled_at,
      })),
    })
  } catch (error) {
    console.error('Get course students error:', error)
    res.status(500).json({ error: '학생 목록 조회에 실패했습니다.' })
  }
})

/**
 * POST /api/attendance
 * Create a single attendance record
 */
router.post('/', requireInstructor, async (req, res) => {
  try {
    const { studentId, courseId, sessionDate, weekNumber, status, notes } = req.body
    const userId = req.user.id

    if (!studentId || !courseId || !sessionDate || !weekNumber) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' })
    }

    // Verify instructor owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, instructor_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' })
    }

    if (course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 강의의 출석을 기록할 권한이 없습니다.' })
    }

    // Verify student is enrolled
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single()

    if (enrollError || !enrollment) {
      return res.status(400).json({ error: '해당 학생은 이 강의에 등록되어 있지 않습니다.' })
    }

    // Upsert attendance record
    const { data: attendance, error } = await supabase
      .from('attendance')
      .upsert(
        {
          student_id: studentId,
          course_id: courseId,
          session_date: sessionDate,
          week_number: weekNumber,
          status: status || 'present',
          notes: notes || null,
          check_in_time: status === 'present' || status === 'late' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'student_id,course_id,session_date',
        }
      )
      .select()
      .single()

    if (error) throw error

    res.json({ attendance })
  } catch (error) {
    console.error('Create attendance error:', error)
    res.status(500).json({ error: '출석 기록에 실패했습니다.' })
  }
})

/**
 * POST /api/attendance/bulk
 * Create/update attendance for multiple students at once
 */
router.post('/bulk', requireInstructor, async (req, res) => {
  try {
    const { courseId, sessionDate, weekNumber, records } = req.body
    const userId = req.user.id

    if (!courseId || !sessionDate || !weekNumber || !Array.isArray(records)) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' })
    }

    // Verify instructor owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, instructor_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' })
    }

    if (course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 강의의 출석을 기록할 권한이 없습니다.' })
    }

    // Prepare attendance records
    const attendanceRecords = records.map((record) => ({
      student_id: record.studentId,
      course_id: courseId,
      session_date: sessionDate,
      week_number: weekNumber,
      status: record.status || 'present',
      notes: record.notes || null,
      check_in_time:
        record.status === 'present' || record.status === 'late'
          ? new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    }))

    // Upsert all records
    const { data: attendance, error } = await supabase
      .from('attendance')
      .upsert(attendanceRecords, {
        onConflict: 'student_id,course_id,session_date',
      })
      .select()

    if (error) throw error

    res.json({
      message: `${attendance.length}명의 출석이 기록되었습니다.`,
      attendance,
    })
  } catch (error) {
    console.error('Bulk attendance error:', error)
    res.status(500).json({ error: '출석 일괄 기록에 실패했습니다.' })
  }
})

/**
 * PUT /api/attendance/:id
 * Update an attendance record
 */
router.put('/:id', requireInstructor, async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes } = req.body
    const userId = req.user.id

    // Get the attendance record with course info
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        *,
        course:courses!attendance_course_id_fkey(id, instructor_id)
      `)
      .eq('id', id)
      .single()

    if (attendanceError || !attendance) {
      return res.status(404).json({ error: '출석 기록을 찾을 수 없습니다.' })
    }

    if (attendance.course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 출석 기록을 수정할 권한이 없습니다.' })
    }

    // Update
    const { data: updated, error } = await supabase
      .from('attendance')
      .update({
        status: status || attendance.status,
        notes: notes !== undefined ? notes : attendance.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ attendance: updated })
  } catch (error) {
    console.error('Update attendance error:', error)
    res.status(500).json({ error: '출석 수정에 실패했습니다.' })
  }
})

/**
 * DELETE /api/attendance/:id
 * Delete an attendance record
 */
router.delete('/:id', requireInstructor, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Get the attendance record with course info
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        *,
        course:courses!attendance_course_id_fkey(id, instructor_id)
      `)
      .eq('id', id)
      .single()

    if (attendanceError || !attendance) {
      return res.status(404).json({ error: '출석 기록을 찾을 수 없습니다.' })
    }

    if (attendance.course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 출석 기록을 삭제할 권한이 없습니다.' })
    }

    // Delete
    const { error } = await supabase.from('attendance').delete().eq('id', id)

    if (error) throw error

    res.json({ message: '출석 기록이 삭제되었습니다.' })
  } catch (error) {
    console.error('Delete attendance error:', error)
    res.status(500).json({ error: '출석 삭제에 실패했습니다.' })
  }
})

/**
 * GET /api/attendance/course/:courseId/stats
 * Get attendance statistics for a course
 */
router.get('/course/:courseId/stats', requireInstructor, async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.user.id

    // Verify instructor owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, instructor_id, title')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' })
    }

    if (course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 강의의 출석 통계를 조회할 권한이 없습니다.' })
    }

    // Get all attendance records
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('status, student_id')
      .eq('course_id', courseId)

    if (attendanceError) throw attendanceError

    // Get total sessions (unique dates)
    const { data: sessions, error: sessionsError } = await supabase
      .from('attendance')
      .select('session_date')
      .eq('course_id', courseId)

    if (sessionsError) throw sessionsError

    const uniqueSessions = [...new Set(sessions.map((s) => s.session_date))]

    // Calculate stats
    const statusCounts = attendance.reduce(
      (acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1
        return acc
      },
      { present: 0, absent: 0, late: 0, excused: 0 }
    )

    const total = attendance.length
    const attendanceRate =
      total > 0
        ? Math.round(((statusCounts.present + statusCounts.late) / total) * 100)
        : 0

    // Get unique students
    const uniqueStudents = [...new Set(attendance.map((a) => a.student_id))]

    res.json({
      course: { id: course.id, title: course.title },
      stats: {
        totalSessions: uniqueSessions.length,
        totalRecords: total,
        studentCount: uniqueStudents.length,
        ...statusCounts,
        attendanceRate,
      },
      sessions: uniqueSessions.sort().reverse(),
    })
  } catch (error) {
    console.error('Get attendance stats error:', error)
    res.status(500).json({ error: '출석 통계 조회에 실패했습니다.' })
  }
})

export default router
