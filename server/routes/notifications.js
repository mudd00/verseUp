import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from '../services/notificationService.js'

const router = Router()

// 모든 라우트에 인증 필요
router.use(authMiddleware)

/**
 * GET /api/notifications
 * 사용자의 알림 목록 조회
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id
    const { limit = 20, offset = 0, unreadOnly = 'false' } = req.query

    const { notifications, total } = await getUserNotifications(userId, {
      limit: Number(limit),
      offset: Number(offset),
      unreadOnly: unreadOnly === 'true',
    })

    res.json({
      notifications,
      total,
      limit: Number(limit),
      offset: Number(offset),
    })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * GET /api/notifications/unread-count
 * 읽지 않은 알림 개수 조회
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id
    const count = await getUnreadCount(userId)

    res.json({ count })
  } catch (error) {
    console.error('Failed to get unread count:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * PUT /api/notifications/:id/read
 * 특정 알림을 읽음 상태로 변경
 */
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const notification = await markAsRead(id, userId)

    res.json({ notification })
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * PUT /api/notifications/read-all
 * 모든 알림을 읽음 상태로 변경
 */
router.put('/read-all', async (req, res) => {
  try {
    const userId = req.user.id

    const count = await markAllAsRead(userId)

    res.json({ message: 'All notifications marked as read', count })
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * DELETE /api/notifications/:id
 * 특정 알림 삭제
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    await deleteNotification(id, userId)

    res.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    console.error('Failed to delete notification:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

export default router
