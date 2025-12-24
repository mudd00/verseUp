import api from './api'

class ParentService {
  /**
   * Register a new parent account using invite code
   */
  async registerParent({ inviteCode, name, email, password }) {
    return api.post('/auth/register-parent', {
      inviteCode,
      name,
      email,
      password,
    })
  }

  /**
   * Get list of connected children
   */
  async getChildren() {
    return api.get('/parents/children')
  }

  /**
   * Set nickname for a child
   */
  async setNickname(studentId, nickname) {
    return api.post(`/parents/children/${studentId}/nickname`, { nickname })
  }

  /**
   * Disconnect from a child
   */
  async disconnectChild(linkId) {
    return api.delete(`/parents/children/${linkId}`)
  }

  /**
   * Get child's dashboard data
   */
  async getDashboard(studentId) {
    return api.get(`/parents/children/${studentId}/dashboard`)
  }

  /**
   * Get child's enrolled courses
   */
  async getCourses(studentId) {
    return api.get(`/parents/children/${studentId}/courses`)
  }

  /**
   * Get child's assignments
   */
  async getAssignments(studentId, courseId = null) {
    const params = courseId ? `?courseId=${courseId}` : ''
    return api.get(`/parents/children/${studentId}/assignments${params}`)
  }

  /**
   * Get child's attendance records
   */
  async getAttendance(studentId, filters = {}) {
    const params = new URLSearchParams(filters).toString()
    return api.get(`/parents/children/${studentId}/attendance?${params}`)
  }

  /**
   * Get child's learning progress
   */
  async getProgress(studentId) {
    return api.get(`/parents/children/${studentId}/progress`)
  }

  /**
   * Get child's current location in metaverse
   */
  async getChildLocation(studentId) {
    return api.get(`/parents/children/${studentId}/location`)
  }
}

export const parentService = new ParentService()
export default parentService
