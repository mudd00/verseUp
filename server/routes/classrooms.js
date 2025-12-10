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

export default router
