import { supabase } from '../utils/supabase.js'

/**
 * Notification Service
 * 알림 생성, 조회, 업데이트 등을 처리하는 서비스
 */

export const NotificationType = {
  COURSE_APPROVED: 'course_approved',
  COURSE_REJECTED: 'course_rejected',
  ENROLLMENT: 'enrollment',
  PAYMENT: 'payment',
  REFUND: 'refund',
  ASSIGNMENT_CREATED: 'assignment_created',
  ASSIGNMENT_GRADED: 'assignment_graded',
  COURSE_UPDATED: 'course_updated',
  GENERAL: 'general',
}

/**
 * 알림 생성
 * @param {Object} params
 * @param {string} params.userId - 알림을 받을 사용자 ID
 * @param {string} params.type - 알림 타입 (NotificationType)
 * @param {string} params.title - 알림 제목
 * @param {string} params.message - 알림 내용
 * @param {string} [params.link] - 알림 클릭 시 이동할 URL
 * @param {Object} [params.metadata] - 추가 메타데이터
 * @param {Object} [params.io] - Socket.IO instance for real-time notification
 * @returns {Promise<Object>} 생성된 알림 객체
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link = null,
  metadata = {},
  io = null,
}) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  // 알림 생성
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      link,
      metadata,
      is_read: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create notification:', error)
    throw error
  }

  // 실시간 알림 전송 (Socket.IO)
  if (io && notification) {
    io.to(`user:${userId}`).emit('notification:new', notification)
    console.log(`📬 Real-time notification sent to user ${userId}`)
  }

  return notification
}

/**
 * 사용자의 알림 목록 조회
 * @param {string} userId - 사용자 ID
 * @param {Object} options
 * @param {number} [options.limit=20] - 조회할 알림 개수
 * @param {number} [options.offset=0] - 오프셋
 * @param {boolean} [options.unreadOnly=false] - 읽지 않은 알림만 조회
 * @returns {Promise<Array>} 알림 목록
 */
export async function getUserNotifications(
  userId,
  { limit = 20, offset = 0, unreadOnly = false } = {}
) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to fetch notifications:', error)
    throw error
  }

  return { notifications: data || [], total: count || 0 }
}

/**
 * 알림을 읽음 상태로 변경
 * @param {string} notificationId - 알림 ID
 * @param {string} userId - 사용자 ID (권한 확인용)
 * @returns {Promise<Object>} 업데이트된 알림 객체
 */
export async function markAsRead(notificationId, userId) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId) // 본인 알림만 수정 가능
    .select()
    .single()

  if (error) {
    console.error('Failed to mark notification as read:', error)
    throw error
  }

  return data
}

/**
 * 모든 알림을 읽음 상태로 변경
 * @param {string} userId - 사용자 ID
 * @returns {Promise<number>} 업데이트된 알림 개수
 */
export async function markAllAsRead(userId) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select()

  if (error) {
    console.error('Failed to mark all notifications as read:', error)
    throw error
  }

  return data?.length || 0
}

/**
 * 알림 삭제
 * @param {string} notificationId - 알림 ID
 * @param {string} userId - 사용자 ID (권한 확인용)
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
export async function deleteNotification(notificationId, userId) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId) // 본인 알림만 삭제 가능

  if (error) {
    console.error('Failed to delete notification:', error)
    throw error
  }

  return true
}

/**
 * 읽지 않은 알림 개수 조회
 * @param {string} userId - 사용자 ID
 * @returns {Promise<number>} 읽지 않은 알림 개수
 */
export async function getUnreadCount(userId) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to get unread count:', error)
    throw error
  }

  return count || 0
}

// ========== 특정 이벤트별 알림 생성 헬퍼 함수 ==========

/**
 * 강의 승인 알림
 */
export async function notifyCourseApproved(userId, courseTitle, courseId, io = null) {
  return createNotification({
    userId,
    type: NotificationType.COURSE_APPROVED,
    title: '강의가 승인되었습니다',
    message: `"${courseTitle}" 강의가 관리자에 의해 승인되었습니다. 학생들이 이제 수강 신청할 수 있습니다.`,
    link: `/courses/${courseId}`,
    metadata: { course_id: courseId },
    io,
  })
}

/**
 * 강의 거부 알림
 */
export async function notifyCourseRejected(
  userId,
  courseTitle,
  courseId,
  reason,
  io = null
) {
  return createNotification({
    userId,
    type: NotificationType.COURSE_REJECTED,
    title: '강의가 거부되었습니다',
    message: `"${courseTitle}" 강의가 거부되었습니다. 사유: ${reason}`,
    link: `/courses/${courseId}/edit`,
    metadata: { course_id: courseId, reason },
    io,
  })
}

/**
 * 수강 신청 알림
 */
export async function notifyEnrollment(userId, courseTitle, courseId, io = null) {
  return createNotification({
    userId,
    type: NotificationType.ENROLLMENT,
    title: '수강 신청이 완료되었습니다',
    message: `"${courseTitle}" 강의 수강 신청이 완료되었습니다.`,
    link: `/courses/${courseId}`,
    metadata: { course_id: courseId },
    io,
  })
}

/**
 * 결제 완료 알림
 */
export async function notifyPayment(userId, courseTitle, amount, io = null) {
  return createNotification({
    userId,
    type: NotificationType.PAYMENT,
    title: '결제가 완료되었습니다',
    message: `"${courseTitle}" 강의 결제가 완료되었습니다. (${amount.toLocaleString()}원)`,
    link: '/payment/history',
    metadata: { amount },
    io,
  })
}

/**
 * 환불 완료 알림
 */
export async function notifyRefund(userId, courseTitle, amount, io = null) {
  return createNotification({
    userId,
    type: NotificationType.REFUND,
    title: '환불이 완료되었습니다',
    message: `"${courseTitle}" 강의 환불이 완료되었습니다. (${amount.toLocaleString()}원)`,
    link: '/payment/history',
    metadata: { amount },
    io,
  })
}

/**
 * 과제 생성 알림 (학생들에게)
 */
export async function notifyAssignmentCreated(
  userId,
  assignmentTitle,
  courseTitle,
  assignmentId,
  dueDate,
  io = null
) {
  return createNotification({
    userId,
    type: NotificationType.ASSIGNMENT_CREATED,
    title: '새로운 과제가 등록되었습니다',
    message: `"${courseTitle}" 강의에 "${assignmentTitle}" 과제가 등록되었습니다. 마감일: ${new Date(
      dueDate
    ).toLocaleDateString()}`,
    link: `/assignments/${assignmentId}`,
    metadata: { assignment_id: assignmentId, due_date: dueDate },
    io,
  })
}

/**
 * 과제 채점 완료 알림
 */
export async function notifyAssignmentGraded(
  userId,
  assignmentTitle,
  score,
  maxScore,
  assignmentId,
  io = null
) {
  return createNotification({
    userId,
    type: NotificationType.ASSIGNMENT_GRADED,
    title: '과제가 채점되었습니다',
    message: `"${assignmentTitle}" 과제가 채점되었습니다. 점수: ${score}/${maxScore}`,
    link: `/assignments/${assignmentId}`,
    metadata: { assignment_id: assignmentId, score, max_score: maxScore },
    io,
  })
}
