import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
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

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

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

router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    res.json({ message: 'Enrolled successfully', courseId: id })
  } catch (error) {
    console.error('Error enrolling:', error)
    res.status(500).json({ error: 'Failed to enroll' })
  }
})

export default router
