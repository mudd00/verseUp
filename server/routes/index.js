import { Router } from 'express'
import authRoutes from './auth.js'
import coursesRoutes from './courses.js'
import paymentsRoutes from './payments.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/courses', coursesRoutes)
router.use('/payments', paymentsRoutes)

export default router
