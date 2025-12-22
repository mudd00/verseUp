/**
 * 이메일에서 역할 추론
 * @param {string} email - 사용자 이메일
 * @returns {'instructor' | 'admin' | 'student'} 추론된 역할
 */
export const inferRoleFromEmail = (email) => {
  if (!email) return 'student'
  if (email.includes('instructor@')) return 'instructor'
  if (email.includes('admin@')) return 'admin'
  return 'student'
}

/**
 * 사용자 객체에서 역할 가져오기 (메타데이터 우선, 없으면 이메일 추론)
 * @param {object} user - 사용자 객체
 * @returns {'instructor' | 'admin' | 'student'} 역할
 */
export const getUserRole = (user) => {
  if (!user) return 'student'

  // user_metadata에서 역할 확인 (우선)
  if (user.user_metadata?.role) {
    return user.user_metadata.role
  }

  // 프로필에서 역할 확인
  if (user.role) {
    return user.role
  }

  // 이메일에서 추론
  return inferRoleFromEmail(user.email)
}

/**
 * 역할이 강사인지 확인
 * @param {object} user - 사용자 객체
 * @returns {boolean}
 */
export const isInstructor = (user) => {
  const role = getUserRole(user)
  return role === 'instructor' || role === 'admin'
}

/**
 * 역할이 관리자인지 확인
 * @param {object} user - 사용자 객체
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  return getUserRole(user) === 'admin'
}
