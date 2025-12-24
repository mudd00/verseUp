import { Router } from 'express'
import authRoutes from './auth.js'
import coursesRoutes from './courses.js'
import paymentsRoutes from './payments.js'
import materialsRoutes from './materials.js'
import classroomsRoutes from './classrooms.js'
import notificationsRoutes from './notifications.js'
import assignmentsRoutes from './assignments.js'
import invitesRoutes from './invites.js'
import parentsRoutes from './parents.js'
import attendanceRoutes from './attendance.js'
import progressRoutes from './progress.js'
import adminUsersRoutes from './admin/users.js'
import adminStatsRoutes from './admin/stats.js'
import adminCoursesRoutes from './admin/courses.js'
import adminEnrollmentsRoutes from './admin/enrollments.js'
import adminPaymentsRoutes from './admin/payments.js'
import adminClassroomsRoutes from './admin/classrooms.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/courses', coursesRoutes)
router.use('/payments', paymentsRoutes)
router.use('/classrooms', classroomsRoutes)
router.use('/notifications', notificationsRoutes)
router.use('/invites', invitesRoutes)
router.use('/parents', parentsRoutes)
router.use('/attendance', attendanceRoutes)
router.use('/progress', progressRoutes)
router.use('/', assignmentsRoutes) // assignments routes include /courses/:courseId/assignments
router.use('/admin/users', adminUsersRoutes)
router.use('/admin/stats', adminStatsRoutes)
router.use('/admin/courses', adminCoursesRoutes)
router.use('/admin/enrollments', adminEnrollmentsRoutes)
router.use('/admin/payments', adminPaymentsRoutes)
router.use('/admin/classrooms', adminClassroomsRoutes)
router.use('/', materialsRoutes)

export default router