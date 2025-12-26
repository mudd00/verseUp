import express from 'express'
import { authMiddleware, requireInstructor } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

/**
 * GET /api/progress/course/:courseId
 * Get all progress records for a course (instructor only)
 */
router.get('/course/:courseId', requireInstructor, async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.user.id

    // Verify instructor owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, instructor_id, title, weeks')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' })
    }

    if (course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 강의의 진도율을 조회할 권한이 없습니다.' })
    }

    // Get progress records with student info
    const { data: progress, error } = await supabase
      .from('course_progress')
      .select(`
        *,
        student:profiles!student_id(id, name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .order('student_id')

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    res.json({
      course: { id: course.id, title: course.title, weeks: course.weeks || 10 },
      progress,
    })
  } catch (error) {
    console.error('Get course progress error:', error)
    res.status(500).json({ error: '진도율 조회에 실패했습니다.' })
  }
})

/**
 * GET /api/progress/student/:studentId
 * Get progress for a specific student (student can view their own, instructor can view enrolled students)
 */
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params
    const userId = req.user.id

    // Check access permission
    const isOwnProgress = studentId === userId
    const isInstructor = req.user.role === 'instructor'
    const isAdmin = req.user.role === 'admin'

    if (!isOwnProgress && !isInstructor && !isAdmin) {
      return res.status(403).json({ error: '진도율을 조회할 권한이 없습니다.' })
    }

    // Get progress with course info
    const { data: progress, error } = await supabase
      .from('course_progress')
      .select(`
        *,
        course:courses!course_id(id, title, instructor_id)
      `)
      .eq('student_id', studentId)

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    // If instructor, filter to only their courses
    let filteredProgress = progress
    if (isInstructor && !isAdmin) {
      filteredProgress = progress.filter((p) => p.course.instructor_id === userId)
    }

    res.json({ progress: filteredProgress })
  } catch (error) {
    console.error('Get student progress error:', error)
    res.status(500).json({ error: '진도율 조회에 실패했습니다.' })
  }
})

/**
 * PUT /api/progress/:id
 * Update a progress record (instructor only)
 */
router.put('/:id', requireInstructor, async (req, res) => {
  try {
    const { id } = req.params
    const { currentWeek, completedWeeks, completionPercentage, totalStudyHours } = req.body
    const userId = req.user.id

    // Get progress with course info
    const { data: progress, error: progressError } = await supabase
      .from('course_progress')
      .select(`
        *,
        course:courses!course_id(id, instructor_id)
      `)
      .eq('id', id)
      .single()

    if (progressError || !progress) {
      console.error('Progress query error:', progressError)
      return res.status(404).json({ error: '진도 기록을 찾을 수 없습니다.' })
    }

    if (progress.course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 진도 기록을 수정할 권한이 없습니다.' })
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    }

    if (currentWeek !== undefined) updateData.current_week = currentWeek
    if (completedWeeks !== undefined) updateData.completed_weeks = completedWeeks
    if (completionPercentage !== undefined) updateData.completion_percentage = completionPercentage
    if (totalStudyHours !== undefined) updateData.total_study_hours = totalStudyHours

    // Update
    const { data: updated, error } = await supabase
      .from('course_progress')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ progress: updated })
  } catch (error) {
    console.error('Update progress error:', error)
    res.status(500).json({ error: '진도율 수정에 실패했습니다.' })
  }
})

/**
 * POST /api/progress/:id/complete-week
 * Mark a week as completed
 */
router.post('/:id/complete-week', requireInstructor, async (req, res) => {
  try {
    const { id } = req.params
    const { weekNumber } = req.body
    const userId = req.user.id

    // Get progress with course info including weeks
    const { data: progress, error: progressError } = await supabase
      .from('course_progress')
      .select(`
        *,
        course:courses!course_id(id, instructor_id, weeks)
      `)
      .eq('id', id)
      .single()

    if (progressError || !progress) {
      console.error('Progress query error:', progressError)
      return res.status(404).json({ error: '진도 기록을 찾을 수 없습니다.' })
    }

    const totalWeeks = progress.course.weeks || 10

    if (!weekNumber || weekNumber < 1 || weekNumber > totalWeeks) {
      return res.status(400).json({ error: `유효한 주차를 입력해주세요 (1-${totalWeeks}).` })
    }

    if (progress.course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 진도 기록을 수정할 권한이 없습니다.' })
    }

    // Add week to completed weeks if not already there
    const completedWeeks = progress.completed_weeks || []
    if (!completedWeeks.includes(weekNumber)) {
      completedWeeks.push(weekNumber)
      completedWeeks.sort((a, b) => a - b)
    }

    // Calculate completion percentage based on course weeks
    const completionPercentage = (completedWeeks.length / totalWeeks) * 100

    // Update
    const { data: updated, error } = await supabase
      .from('course_progress')
      .update({
        completed_weeks: completedWeeks,
        current_week: Math.max(...completedWeeks, progress.current_week),
        completion_percentage: completionPercentage,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({
      message: `${weekNumber}주차가 완료 처리되었습니다.`,
      progress: updated,
    })
  } catch (error) {
    console.error('Complete week error:', error)
    res.status(500).json({ error: '주차 완료 처리에 실패했습니다.' })
  }
})

/**
 * POST /api/progress/:id/uncomplete-week
 * Mark a week as not completed
 */
router.post('/:id/uncomplete-week', requireInstructor, async (req, res) => {
  try {
    const { id } = req.params
    const { weekNumber } = req.body
    const userId = req.user.id

    // Get progress with course info including weeks
    const { data: progress, error: progressError } = await supabase
      .from('course_progress')
      .select(`
        *,
        course:courses!course_id(id, instructor_id, weeks)
      `)
      .eq('id', id)
      .single()

    if (progressError || !progress) {
      console.error('Progress query error:', progressError)
      return res.status(404).json({ error: '진도 기록을 찾을 수 없습니다.' })
    }

    const totalWeeks = progress.course.weeks || 10

    if (!weekNumber || weekNumber < 1 || weekNumber > totalWeeks) {
      return res.status(400).json({ error: `유효한 주차를 입력해주세요 (1-${totalWeeks}).` })
    }

    if (progress.course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 진도 기록을 수정할 권한이 없습니다.' })
    }

    // Remove week from completed weeks
    const completedWeeks = (progress.completed_weeks || []).filter((w) => w !== weekNumber)

    // Calculate completion percentage based on course weeks
    const completionPercentage = (completedWeeks.length / totalWeeks) * 100

    // Update
    const { data: updated, error } = await supabase
      .from('course_progress')
      .update({
        completed_weeks: completedWeeks,
        completion_percentage: completionPercentage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({
      message: `${weekNumber}주차 완료가 취소되었습니다.`,
      progress: updated,
    })
  } catch (error) {
    console.error('Uncomplete week error:', error)
    res.status(500).json({ error: '주차 완료 취소에 실패했습니다.' })
  }
})

/**
 * POST /api/progress/course/:courseId/bulk-complete-week
 * Mark a week as completed for all students in a course
 */
router.post('/course/:courseId/bulk-complete-week', requireInstructor, async (req, res) => {
  try {
    const { courseId } = req.params
    const { weekNumber } = req.body
    const userId = req.user.id

    // Verify instructor owns this course and get weeks
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, instructor_id, weeks')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' })
    }

    const totalWeeks = course.weeks || 10

    if (!weekNumber || weekNumber < 1 || weekNumber > totalWeeks) {
      return res.status(400).json({ error: `유효한 주차를 입력해주세요 (1-${totalWeeks}).` })
    }

    if (course.instructor_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '이 강의의 진도율을 수정할 권한이 없습니다.' })
    }

    // Get all progress records for this course
    const { data: progressRecords, error: progressError } = await supabase
      .from('course_progress')
      .select('id, completed_weeks')
      .eq('course_id', courseId)

    if (progressError) throw progressError

    // Update each record
    let updatedCount = 0
    for (const record of progressRecords) {
      const completedWeeks = record.completed_weeks || []
      if (!completedWeeks.includes(weekNumber)) {
        completedWeeks.push(weekNumber)
        completedWeeks.sort((a, b) => a - b)

        const completionPercentage = (completedWeeks.length / totalWeeks) * 100

        await supabase
          .from('course_progress')
          .update({
            completed_weeks: completedWeeks,
            current_week: Math.max(...completedWeeks),
            completion_percentage: completionPercentage,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id)

        updatedCount++
      }
    }

    res.json({
      message: `${updatedCount}명의 학생에게 ${weekNumber}주차가 완료 처리되었습니다.`,
    })
  } catch (error) {
    console.error('Bulk complete week error:', error)
    res.status(500).json({ error: '일괄 주차 완료 처리에 실패했습니다.' })
  }
})

export default router
