import { apiService } from './api'

class AttendanceService {
  /**
   * Get all attendance records for a course
   */
  async getCourseAttendance(courseId) {
    return apiService.get(`/attendance/course/${courseId}`)
  }

  /**
   * Get attendance for a specific session date
   */
  async getSessionAttendance(courseId, date) {
    return apiService.get(`/attendance/course/${courseId}/session/${date}`)
  }

  /**
   * Get enrolled students for a course
   */
  async getCourseStudents(courseId) {
    return apiService.get(`/attendance/course/${courseId}/students`)
  }

  /**
   * Get attendance statistics for a course
   */
  async getCourseStats(courseId) {
    return apiService.get(`/attendance/course/${courseId}/stats`)
  }

  /**
   * Create a single attendance record
   */
  async createAttendance(data) {
    return apiService.post('/attendance', data)
  }

  /**
   * Create/update attendance for multiple students
   */
  async bulkAttendance(data) {
    return apiService.post('/attendance/bulk', data)
  }

  /**
   * Update an attendance record
   */
  async updateAttendance(id, data) {
    return apiService.put(`/attendance/${id}`, data)
  }

  /**
   * Delete an attendance record
   */
  async deleteAttendance(id) {
    return apiService.delete(`/attendance/${id}`)
  }
}

export const attendanceService = new AttendanceService()
