import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

// Get all courses with filtering and search
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // Extract query parameters
    const { search = '', category = '', level = '', minPrice, maxPrice, instructorId = '' } = req.query

    // Start building the query
    let query = supabase
      .from('courses')
      .select(
        `
        *,
        instructor:profiles!courses_instructor_id_fkey(id, name, email),
        classroom:classrooms(id, name, description, capacity),
        time_slot:time_slots(id, day_of_week, start_time, end_time, slot_order)
      `
      )
      .eq('status', 'published')

    // Apply search filter (title or description)
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply category filter
    if (category) {
      query = query.eq('category', category)
    }

    // Apply level filter
    if (level) {
      query = query.eq('level', level)
    }

    // Apply price range filter
    if (minPrice !== undefined) {
      query = query.gte('price', Number(minPrice))
    }
    if (maxPrice !== undefined) {
      query = query.lte('price', Number(maxPrice))
    }

    // Apply instructor filter
    if (instructorId) {
      query = query.eq('instructor_id', instructorId)
    }

    // Apply sorting (newest first)
    query = query.order('created_at', { ascending: false })

    const { data: courses, error } = await query

    if (error) {
      console.error('Error fetching courses:', error)
      return res.status(500).json({ error: 'Failed to fetch courses' })
    }

    res.json({ courses })
  } catch (error) {
    console.error('Error fetching courses:', error)
    res.status(500).json({ error: 'Failed to fetch courses' })
  }
})

// Get instructors list (for filtering)
router.get('/instructors', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // Get unique instructors who have published courses
    const { data: courses, error } = await supabase
      .from('courses')
      .select('instructor:profiles!courses_instructor_id_fkey(id, name)')
      .eq('status', 'published')

    if (error) {
      console.error('Error fetching instructors:', error)
      return res.status(500).json({ error: 'Failed to fetch instructors' })
    }

    // Remove duplicates
    const uniqueInstructors = Array.from(
      new Map(
        courses
          .filter((c) => c.instructor)
          .map((c) => [c.instructor.id, c.instructor])
      ).values()
    )

    res.json({ instructors: uniqueInstructors })
  } catch (error) {
    console.error('Error fetching instructors:', error)
    res.status(500).json({ error: 'Failed to fetch instructors' })
  }
})

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { data: course, error } = await supabase
      .from('courses')
      .select(
        `
        *,
        instructor:profiles!courses_instructor_id_fkey(id, name, email),
        classroom:classrooms(id, name, description, capacity),
        time_slot:time_slots(id, day_of_week, start_time, end_time, slot_order),
        schedules:course_schedules(id, week_number, session_date, start_time, end_time, status)
      `
      )
      .eq('id', id)
      .single()

    if (error || !course) {
      console.error('Error fetching course:', error)
      return res.status(404).json({ error: 'Course not found' })
    }

    res.json({ course })
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

// Create new course (requires auth + instructor role)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user?.user_metadata?.role || req.user?.role

    // Check if user is instructor or admin
    if (userRole !== 'instructor' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Instructor access required' })
    }

    const {
      title,
      description,
      classroomId,
      timeSlotId,
      weeks,
      maxStudents,
      startDate,
      thumbnail,
      price,
    } = req.body

    // Validate required fields
    if (!title || !description || !classroomId || !timeSlotId || !weeks || !startDate) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, classroomId, timeSlotId, weeks, startDate',
      })
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // Check time slot availability
    const { data: availabilityData, error: availabilityError } = await supabase.rpc(
      'check_time_slot_availability',
      {
        p_classroom_id: classroomId,
        p_time_slot_id: timeSlotId,
        p_start_date: startDate,
        p_weeks: parseInt(weeks),
      }
    )

    if (availabilityError) {
      console.error('Error checking availability:', availabilityError)
      return res.status(500).json({ error: 'Failed to check time slot availability' })
    }

    const availability = availabilityData && availabilityData.length > 0 ? availabilityData[0] : null

    if (!availability?.is_available) {
      return res.status(409).json({
        error: 'Time slot not available',
        conflict: {
          courseId: availability?.conflicting_course_id,
          courseTitle: availability?.conflicting_course_title,
          date: availability?.conflict_date,
        },
      })
    }

    // Get time slot details to calculate end date
    const { data: timeSlot, error: timeSlotError } = await supabase
      .from('time_slots')
      .select('day_of_week, start_time, end_time')
      .eq('id', timeSlotId)
      .single()

    if (timeSlotError || !timeSlot) {
      return res.status(404).json({ error: 'Time slot not found' })
    }

    // Calculate end date (last session date)
    const start = new Date(startDate)
    const dayOfWeek = timeSlot.day_of_week
    const currentDay = start.getDay() === 0 ? 7 : start.getDay() // Convert Sunday from 0 to 7

    // Calculate days to add to get to the target day of week
    let daysToAdd = (dayOfWeek - currentDay + 7) % 7
    if (daysToAdd === 0 && start.toISOString().split('T')[0] !== startDate) {
      daysToAdd = 7
    }

    const firstSessionDate = new Date(start)
    firstSessionDate.setDate(start.getDate() + daysToAdd)

    const lastSessionDate = new Date(firstSessionDate)
    lastSessionDate.setDate(firstSessionDate.getDate() + (weeks - 1) * 7)

    // Create course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title,
        description,
        instructor_id: userId,
        classroom_id: classroomId,
        time_slot_id: timeSlotId,
        weeks: parseInt(weeks),
        max_students: maxStudents || 20,
        start_date: startDate,
        end_date: lastSessionDate.toISOString().split('T')[0],
        thumbnail: thumbnail || '',
        price: price || 0,
        status: 'published',
      })
      .select(
        `
        *,
        instructor:profiles!courses_instructor_id_fkey(id, name, email),
        classroom:classrooms(id, name, description, capacity),
        time_slot:time_slots(id, day_of_week, start_time, end_time, slot_order)
      `
      )
      .single()

    if (courseError) {
      console.error('Error creating course:', courseError)
      return res.status(500).json({ error: 'Failed to create course' })
    }

    res.status(201).json({ course })
  } catch (error) {
    console.error('Error creating course:', error)
    res.status(500).json({ error: 'Failed to create course' })
  }
})

// Update course (requires auth + instructor/admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user?.user_metadata?.role || req.user?.role

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // Get existing course
    const { data: existingCourse, error: fetchError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingCourse) {
      return res.status(404).json({ error: 'Course not found' })
    }

    // Check if user is the instructor or admin
    if (existingCourse.instructor_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this course' })
    }

    const { title, description, maxStudents, thumbnail, price, status } = req.body

    const updates = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (maxStudents !== undefined) updates.max_students = maxStudents
    if (thumbnail !== undefined) updates.thumbnail = thumbnail
    if (price !== undefined) updates.price = price
    if (status !== undefined) updates.status = status

    const { data: course, error: updateError } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        instructor:profiles!courses_instructor_id_fkey(id, name, email),
        classroom:classrooms(id, name, description, capacity),
        time_slot:time_slots(id, day_of_week, start_time, end_time, slot_order)
      `
      )
      .single()

    if (updateError) {
      console.error('Error updating course:', updateError)
      return res.status(500).json({ error: 'Failed to update course' })
    }

    res.json({ course })
  } catch (error) {
    console.error('Error updating course:', error)
    res.status(500).json({ error: 'Failed to update course' })
  }
})

// Delete course (requires auth + instructor/admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user?.user_metadata?.role || req.user?.role

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // Get existing course
    const { data: existingCourse, error: fetchError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingCourse) {
      return res.status(404).json({ error: 'Course not found' })
    }

    // Check if user is the instructor or admin
    if (existingCourse.instructor_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this course' })
    }

    const { error: deleteError } = await supabase.from('courses').delete().eq('id', id)

    if (deleteError) {
      console.error('Error deleting course:', deleteError)
      return res.status(500).json({ error: 'Failed to delete course' })
    }

    res.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Error deleting course:', error)
    res.status(500).json({ error: 'Failed to delete course' })
  }
})

// Drop course (requires auth)
router.post('/:id/drop', authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.id
    const userId = req.user.id

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 1. 현재 수강 중인지 확인
    const { data: enrollment, error: checkError } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('course_id', courseId)
      .eq('student_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (checkError) {
      console.error('수강 신청 확인 실패:', checkError)
      return res.status(500).json({ error: '수강 취소 확인에 실패했습니다.' })
    }

    if (!enrollment) {
      return res.status(400).json({ error: '수강 중인 강의가 아닙니다.' })
    }

    // 2. 수강 취소 (status를 dropped로 변경)
    const { data: updated, error: updateError } = await supabase
      .from('enrollments')
      .update({
        status: 'dropped',
      })
      .eq('id', enrollment.id)
      .select()
      .single()

    if (updateError) {
      console.error('수강 취소 실패:', updateError)
      return res.status(500).json({ error: '수강 취소에 실패했습니다.' })
    }

    res.json({
      message: '수강 취소가 완료되었습니다.',
      enrollment: updated,
      courseId,
    })
  } catch (error) {
    console.error('Error dropping course:', error)
    res.status(500).json({ error: 'Failed to drop course' })
  }
})

// Check access to classroom for a course (requires auth)
router.get('/:id/check-access', authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.id
    const userId = req.user.id
    const userRole = req.user?.user_metadata?.role || req.user?.role

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 1. 강의 정보 조회
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(
        `
        *,
        instructor:profiles!courses_instructor_id_fkey(id, name, email),
        classroom:classrooms(id, name, description, capacity),
        time_slot:time_slots(id, day_of_week, start_time, end_time, slot_order),
        schedules:course_schedules(id, week_number, session_date, start_time, end_time, status)
      `
      )
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      console.error('강의 조회 실패:', courseError)
      return res.status(404).json({ error: '강의를 찾을 수 없습니다.' })
    }

    // 2. 접근 권한 확인
    let hasAccess = false
    let accessReason = ''

    // 관리자는 항상 허용
    if (userRole === 'admin') {
      hasAccess = true
      accessReason = 'admin'
    }
    // 강사이고 해당 강의의 instructor면 허용
    else if (course.instructor_id === userId) {
      hasAccess = true
      accessReason = 'instructor'
    }
    // 학생이면 수강 신청 확인
    else {
      const { data: enrollment, error: enrollError } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('course_id', courseId)
        .eq('student_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      if (enrollError) {
        console.error('수강 신청 확인 실패:', enrollError)
      }

      if (enrollment) {
        hasAccess = true
        accessReason = 'enrolled'
      }
    }

    // 3. 현재 시간에 해당하는 스케줄 찾기 (선택사항)
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM

    const currentSchedule = course.schedules?.find(
      (schedule) =>
        schedule.session_date === today &&
        schedule.start_time <= currentTime &&
        schedule.end_time >= currentTime &&
        schedule.status === 'scheduled'
    )

    res.json({
      hasAccess,
      accessReason,
      course,
      currentSchedule: currentSchedule || null,
    })
  } catch (error) {
    console.error('Error checking classroom access:', error)
    res.status(500).json({ error: 'Failed to check classroom access' })
  }
})

export default router