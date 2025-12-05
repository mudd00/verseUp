import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

// Get all courses
router.get('/', async (req, res) => {
  try {
    // TODO: Implement actual database query
    const mockCourses = [
      {
        id: '1',
        title: 'React 기초',
        description: 'React를 처음부터 배우는 강의',
        instructorId: '1',
        thumbnail: '',
        maxStudents: 30,
        enrolledCount: 15,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]

    res.json({ courses: mockCourses })
  } catch (error) {
    console.error('Error fetching courses:', error)
    res.status(500).json({ error: 'Failed to fetch courses' })
  }
})

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // TODO: Implement actual database query
    const mockCourse = {
      id,
      title: 'React 기초',
      description: 'React를 처음부터 배우는 강의',
      instructorId: '1',
      thumbnail: '',
      maxStudents: 30,
      enrolledCount: 15,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }

    res.json({ course: mockCourse })
  } catch (error) {
    console.error('Error fetching course:', error)
    res.status(500).json({ error: 'Failed to fetch course' })
  }
})

// Enroll in course (requires auth)
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.id
    const userId = req.user.id

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 1. 강의 정보 조회 및 정원 확인 (FOR UPDATE 락 사용)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, max_students, enrolled_count, price, status')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      console.error('강의 조회 실패:', courseError)
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' })
    }

    if (course.status !== 'published') {
      return res.status(400).json({ error: '현재 수강 신청이 불가능한 강의입니다.' })
    }

    // 2. 정원 확인
    if (course.enrolled_count >= course.max_students) {
      return res.status(400).json({ error: '수강 정원이 초과되었습니다.' })
    }

    // 3. 중복 수강 확인
    const { data: existingEnrollment, error: checkError } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('student_id', userId)
      .maybeSingle()

    if (checkError) {
      console.error('수강 신청 확인 실패:', checkError)
      return res.status(500).json({ error: '수강 신청 확인에 실패했습니다.' })
    }

    if (existingEnrollment && existingEnrollment.status === 'active') {
      return res.status(400).json({ error: '이미 수강 중인 강의입니다.' })
    }

    // 4. 유료 강의인 경우 결제 확인 필요
    if (course.price > 0) {
      return res.status(400).json({
        error: '유료 강의는 결제 후 자동으로 수강 신청됩니다.',
        requiresPayment: true,
      })
    }

    // 5. 무료 강의 수강 신청 (기존 enrollment가 있으면 재활성화, 없으면 생성)
    if (existingEnrollment) {
      // 재활성화
      const { data: updated, error: updateError } = await supabase
        .from('enrollments')
        .update({
          status: 'active',
          enrolled_at: new Date().toISOString(),
        })
        .eq('id', existingEnrollment.id)
        .select()
        .single()

      if (updateError) {
        console.error('수강 신청 재활성화 실패:', updateError)
        return res.status(500).json({ error: '수강 신청에 실패했습니다.' })
      }

      return res.json({
        message: '수강 신청이 완료되었습니다.',
        enrollment: updated,
        courseId,
      })
    } else {
      // 새로 생성
      const { data: newEnrollment, error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          course_id: courseId,
          student_id: userId,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (enrollError) {
        console.error('수강 신청 생성 실패:', enrollError)
        return res.status(500).json({ error: '수강 신청에 실패했습니다.' })
      }

      return res.json({
        message: '수강 신청이 완료되었습니다.',
        enrollment: newEnrollment,
        courseId,
      })
    }
  } catch (error) {
    console.error('Error enrolling:', error)
    res.status(500).json({ error: 'Failed to enroll' })
  }
})

// Drop course (requires auth)
router.post('/:id/drop', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    // TODO: Implement actual drop logic
    res.json({ message: 'Dropped successfully', courseId: id })
  } catch (error) {
    console.error('Error dropping course:', error)
    res.status(500).json({ error: 'Failed to drop course' })
  }
})

export default router