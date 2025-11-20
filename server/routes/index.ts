import { Router } from 'express'
import authRoutes from './auth.js'
import coursesRoutes from './courses.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/courses', coursesRoutes)

export default router
