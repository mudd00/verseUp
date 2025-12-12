import { Router } from 'express'
import authRoutes from './auth.js'
import coursesRoutes from './courses.js'
import paymentsRoutes from './payments.js'
import materialsRoutes from './materials.js'
import classroomsRoutes from './classrooms.js'
import adminUsersRoutes from './admin/users.js'
import adminStatsRoutes from './admin/stats.js'
import adminCoursesRoutes from './admin/courses.js'
import adminEnrollmentsRoutes from './admin/enrollments.js'
import adminPaymentsRoutes from './admin/payments.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/courses', coursesRoutes)
router.use('/payments', paymentsRoutes)
router.use('/classrooms', classroomsRoutes)
router.use('/admin/users', adminUsersRoutes)
router.use('/admin/stats', adminStatsRoutes)
router.use('/admin/courses', adminCoursesRoutes)
router.use('/admin/enrollments', adminEnrollmentsRoutes)
router.use('/admin', adminPaymentsRoutes)
router.use('/', materialsRoutes)

export default router