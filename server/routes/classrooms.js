import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

// Get all classrooms
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { data: classrooms, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching classrooms:', error)
      return res.status(500).json({ error: 'Failed to fetch classrooms' })
    }

    res.json({ classrooms })
  } catch (error) {
    console.error('Error fetching classrooms:', error)
    res.status(500).json({ error: 'Failed to fetch classrooms' })
  }
})

// Get classroom by ID with time slots
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .single()

    if (classroomError || !classroom) {
      return res.status(404).json({ error: 'Classroom not found' })
    }

    const { data: timeSlots, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('classroom_id', id)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('slot_order', { ascending: true })

    if (slotsError) {
      console.error('Error fetching time slots:', slotsError)
      return res.status(500).json({ error: 'Failed to fetch time slots' })
    }

    res.json({
      classroom: {
        ...classroom,
        timeSlots: timeSlots || [],
      },
    })
  } catch (error) {
    console.error('Error fetching classroom:', error)
    res.status(500).json({ error: 'Failed to fetch classroom' })
  }
})

// Get available time slots for a classroom on a specific date range
router.post('/:id/available-slots', async (req, res) => {
  try {
    const { id } = req.params
    const { startDate, weeks } = req.body

    if (!startDate || !weeks) {
      return res.status(400).json({ error: 'startDate and weeks are required' })
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // Get all time slots for this classroom
    const { data: timeSlots, error: slotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('classroom_id', id)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('slot_order', { ascending: true })

    if (slotsError) {
      console.error('Error fetching time slots:', slotsError)
      return res.status(500).json({ error: 'Failed to fetch time slots' })
    }

    // Check availability for each time slot
    const availabilityPromises = timeSlots.map(async (slot) => {
      const { data, error } = await supabase.rpc('check_time_slot_availability', {
        p_classroom_id: id,
        p_time_slot_id: slot.id,
        p_start_date: startDate,
        p_weeks: parseInt(weeks),
      })

      if (error) {
        console.error('Error checking availability:', error)
        return {
          ...slot,
          isAvailable: false,
          error: true,
        }
      }

      const result = data && data.length > 0 ? data[0] : null

      return {
        ...slot,
        isAvailable: result?.is_available || false,
        conflictingCourse: result?.is_available
          ? null
          : {
              id: result?.conflicting_course_id,
              title: result?.conflicting_course_title,
              date: result?.conflict_date,
            },
      }
    })

    const availability = await Promise.all(availabilityPromises)

    res.json({ timeSlots: availability })
  } catch (error) {
    console.error('Error checking availability:', error)
    res.status(500).json({ error: 'Failed to check availability' })
  }
})

// Admin: Create new classroom (requires auth + admin role)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, capacity } = req.body
    const userRole = req.user?.user_metadata?.role || req.user?.role

    // Check if user is admin
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    if (!name) {
      return res.status(400).json({ error: 'Classroom name is required' })
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { data: classroom, error } = await supabase
      .from('classrooms')
      .insert({
        name,
        description,
        capacity: capacity || 20,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating classroom:', error)
      return res.status(500).json({ error: 'Failed to create classroom' })
    }

    res.status(201).json({ classroom })
  } catch (error) {
    console.error('Error creating classroom:', error)
    res.status(500).json({ error: 'Failed to create classroom' })
  }
})

// Admin: Update classroom (requires auth + admin role)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, capacity, status } = req.body
    const userRole = req.user?.user_metadata?.role || req.user?.role

    // Check if user is admin
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const updates = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (capacity !== undefined) updates.capacity = capacity
    if (status !== undefined) updates.status = status

    const { data: classroom, error } = await supabase
      .from('classrooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating classroom:', error)
      return res.status(500).json({ error: 'Failed to update classroom' })
    }

    res.json({ classroom })
  } catch (error) {
    console.error('Error updating classroom:', error)
    res.status(500).json({ error: 'Failed to update classroom' })
  }
})

// Check classroom access for current time (requires auth)
router.get('/:id/check-access', authMiddleware, async (req, res) => {
  try {
    const classroomId = req.params.id
    const userId = req.user.id
    const userRole = req.user?.user_metadata?.role || req.user?.role

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // 1. 교실 정보 조회
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', classroomId)
      .single()

    if (classroomError || !classroom) {
      console.error('교실 조회 실패:', classroomError)
      return res.status(404).json({ error: '교실을 찾을 수 없습니다.' })
    }

    // 2. 현재 시간 계산
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 8) // HH:MM:SS

    // 3. 현재 시간에 해당 교실에서 진행 중인 강의 찾기
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(
        `
        *,
        instructor:profiles!courses_instructor_id_fkey(id, name, email),
        classroom:classrooms(id, name, description, capacity),
        time_slot:time_slots(id, day_of_week, start_time, end_time, slot_order),
        schedules:course_schedules!inner(id, week_number, session_date, start_time, end_time, status)
      `
      )
      .eq('classroom_id', classroomId)
      .eq('schedules.session_date', today)
      .eq('schedules.status', 'scheduled')

    if (coursesError) {
      console.error('강의 조회 실패:', coursesError)
      return res.status(500).json({ error: '강의 조회에 실패했습니다.' })
    }

    // 4. 현재 시간에 맞는 강의 필터링
    const currentCourse = courses?.find((course) => {
      return course.schedules?.some((schedule) => {
        return (
          schedule.session_date === today &&
          schedule.start_time <= currentTime &&
          schedule.end_time >= currentTime &&
          schedule.status === 'scheduled'
        )
      })
    })

    // 5. 현재 시간에 진행 중인 강의가 없으면
    if (!currentCourse) {
      return res.json({
        hasAccess: false,
        reason: 'no_session',
        message: '현재 시간에 진행 중인 강의가 없습니다.',
        classroom,
      })
    }

    // 6. 접근 권한 확인
    let hasAccess = false
    let accessReason = ''

    // 관리자는 항상 허용
    if (userRole === 'admin') {
      hasAccess = true
      accessReason = 'admin'
    }
    // 강사이고 해당 강의의 instructor면 허용
    else if (currentCourse.instructor_id === userId) {
      hasAccess = true
      accessReason = 'instructor'
    }
    // 학생이면 수강 신청 확인
    else {
      const { data: enrollment, error: enrollError } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('course_id', currentCourse.id)
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

    // 7. 결과 반환
    if (!hasAccess) {
      return res.json({
        hasAccess: false,
        reason: 'not_enrolled',
        message: '이 강의실에 접근할 권한이 없습니다. 해당 강의를 수강 신청해주세요.',
        classroom,
        currentCourse: {
          id: currentCourse.id,
          title: currentCourse.title,
          instructor: currentCourse.instructor,
        },
      })
    }

    res.json({
      hasAccess: true,
      accessReason,
      classroom,
      course: currentCourse,
      currentSchedule: currentCourse.schedules?.find((s) => s.session_date === today),
    })
  } catch (error) {
    console.error('Error checking classroom access:', error)
    res.status(500).json({ error: 'Failed to check classroom access' })
  }
})

export default router
