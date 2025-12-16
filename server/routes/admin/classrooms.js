import express from 'express'
import { authMiddleware, requireAdmin } from '../../middleware/auth.js'
import { supabase } from '../../utils/supabase.js'

const router = express.Router()

router.use(authMiddleware, requireAdmin)

/**
 * GET /api/admin/classrooms
 * 전체 강의실 목록 (inactive 포함)
 */
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { data: classrooms, error } = await supabase
      .from('classrooms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // 각 강의실별로 사용 중인 강의 수 조회
    const classroomsWithStats = await Promise.all(
      classrooms.map(async (classroom) => {
        const { count } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('classroom_id', classroom.id)
          .eq('status', 'published')

        return {
          ...classroom,
          activeCoursesCount: count || 0,
        }
      })
    )

    res.json({ classrooms: classroomsWithStats || [] })
  } catch (error) {
    console.error('강의실 목록 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/classrooms/:id
 * 강의실 상세 정보
 */
router.get('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params

    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .single()

    if (classroomError || !classroom) {
      return res.status(404).json({ error: 'Classroom not found' })
    }

    // 시간표 슬롯 조회
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('*')
      .eq('classroom_id', id)
      .order('day_of_week', { ascending: true })
      .order('slot_order', { ascending: true })

    // 사용 중인 강의 조회
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, course_code, status')
      .eq('classroom_id', id)

    res.json({
      classroom: {
        ...classroom,
        timeSlots: timeSlots || [],
        courses: courses || [],
      },
    })
  } catch (error) {
    console.error('강의실 상세 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * POST /api/admin/classrooms
 * 강의실 생성
 */
router.post('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { name, description, capacity } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Classroom name is required' })
    }

    const { data: classroom, error } = await supabase
      .from('classrooms')
      .insert({
        name,
        description,
        capacity: capacity || 20,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ classroom })
  } catch (error) {
    console.error('강의실 생성 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * PUT /api/admin/classrooms/:id
 * 강의실 수정
 */
router.put('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params
    const { name, description, capacity, status } = req.body

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

    if (error) throw error

    res.json({ classroom })
  } catch (error) {
    console.error('강의실 수정 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * DELETE /api/admin/classrooms/:id
 * 강의실 삭제 (실제로는 비활성화)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params

    // 사용 중인 강의가 있는지 확인
    const { count } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('classroom_id', id)
      .eq('status', 'published')

    if (count > 0) {
      return res.status(400).json({
        error: 'Cannot delete classroom with active courses',
        activeCoursesCount: count,
      })
    }

    // 강의실을 비활성화
    const { error } = await supabase
      .from('classrooms')
      .update({ status: 'inactive' })
      .eq('id', id)

    if (error) throw error

    res.json({ message: 'Classroom deleted successfully' })
  } catch (error) {
    console.error('강의실 삭제 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/classrooms/stats
 * 강의실 통계
 */
router.get('/stats', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { count: totalClassrooms } = await supabase
      .from('classrooms')
      .select('*', { count: 'exact', head: true })

    const { count: activeClassrooms } = await supabase
      .from('classrooms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    res.json({
      totalClassrooms: totalClassrooms || 0,
      activeClassrooms: activeClassrooms || 0,
      inactiveClassrooms: (totalClassrooms || 0) - (activeClassrooms || 0),
    })
  } catch (error) {
    console.error('강의실 통계 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/admin/classrooms/:id/time-slots
 * 강의실의 시간표 슬롯 목록 (해당 슬롯을 사용하는 강의 정보 포함)
 */
router.get('/:id/time-slots', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params

    const { data: timeSlots, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('classroom_id', id)
      .order('day_of_week', { ascending: true })
      .order('slot_order', { ascending: true })

    if (error) throw error

    // 각 시간표 슬롯에 대해 해당 슬롯을 사용하는 강의 조회
    const timeSlotsWithCourses = await Promise.all(
      (timeSlots || []).map(async (slot) => {
        const { data: courses } = await supabase
          .from('courses')
          .select('id, title, course_code, status, instructor_id')
          .eq('time_slot_id', slot.id)
          .eq('status', 'published')

        // 강사 정보 조회
        const coursesWithInstructor = await Promise.all(
          (courses || []).map(async (course) => {
            const { data: instructor } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('id', course.instructor_id)
              .single()

            return {
              ...course,
              instructor: instructor || null,
            }
          })
        )

        return {
          ...slot,
          courses: coursesWithInstructor || [],
        }
      })
    )

    res.json({ timeSlots: timeSlotsWithCourses })
  } catch (error) {
    console.error('시간표 슬롯 조회 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * POST /api/admin/classrooms/:id/time-slots
 * 시간표 슬롯 생성
 */
router.post('/:id/time-slots', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { id } = req.params
    const { day_of_week, start_time, end_time, slot_order } = req.body

    if (day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data: timeSlot, error } = await supabase
      .from('time_slots')
      .insert({
        classroom_id: id,
        day_of_week: Number(day_of_week),
        start_time,
        end_time,
        slot_order: slot_order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ timeSlot })
  } catch (error) {
    console.error('시간표 슬롯 생성 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * PUT /api/admin/classrooms/:classroomId/time-slots/:slotId
 * 시간표 슬롯 수정
 */
router.put('/:classroomId/time-slots/:slotId', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { slotId } = req.params
    const { day_of_week, start_time, end_time, slot_order, is_active } = req.body

    const updates = {}
    if (day_of_week !== undefined) updates.day_of_week = Number(day_of_week)
    if (start_time !== undefined) updates.start_time = start_time
    if (end_time !== undefined) updates.end_time = end_time
    if (slot_order !== undefined) updates.slot_order = slot_order
    if (is_active !== undefined) updates.is_active = is_active

    const { data: timeSlot, error } = await supabase
      .from('time_slots')
      .update(updates)
      .eq('id', slotId)
      .select()
      .single()

    if (error) throw error

    res.json({ timeSlot })
  } catch (error) {
    console.error('시간표 슬롯 수정 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * DELETE /api/admin/classrooms/:classroomId/time-slots/:slotId
 * 시간표 슬롯 삭제
 */
router.delete('/:classroomId/time-slots/:slotId', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    const { slotId } = req.params

    const { error } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', slotId)

    if (error) throw error

    res.json({ message: 'Time slot deleted successfully' })
  } catch (error) {
    console.error('시간표 슬롯 삭제 실패:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

export default router
