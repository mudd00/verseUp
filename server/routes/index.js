import { Router } from 'express'
import authRoutes from './auth.js'
import coursesRoutes from './courses.js'
import paymentsRoutes from './payments.js'
import materialsRoutes from './materials.js'
import classroomsRoutes from './classrooms.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/courses', coursesRoutes)
router.use('/payments', paymentsRoutes)
router.use('/classrooms', classroomsRoutes)
router.use('/', materialsRoutes)

export default router