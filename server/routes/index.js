import { Router } from 'express'
import authRoutes from './auth.js'
import coursesRoutes from './courses.js'
import paymentsRoutes from './payments.js'
import materialsRoutes from './materials.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/courses', coursesRoutes)
router.use('/payments', paymentsRoutes)
router.use('/', materialsRoutes)

export default router