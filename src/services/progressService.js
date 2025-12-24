import { apiService } from './api'

class ProgressService {
  /**
   * Get all progress records for a course
   */
  async getCourseProgress(courseId) {
    return apiService.get(`/progress/course/${courseId}`)
  }

  /**
   * Get progress for a specific student
   */
  async getStudentProgress(studentId) {
    return apiService.get(`/progress/student/${studentId}`)
  }

  /**
   * Update a progress record
   */
  async updateProgress(id, data) {
    return apiService.put(`/progress/${id}`, data)
  }

  /**
   * Mark a week as completed for a student
   */
  async completeWeek(progressId, weekNumber) {
    return apiService.post(`/progress/${progressId}/complete-week`, { weekNumber })
  }

  /**
   * Mark a week as not completed for a student
   */
  async uncompleteWeek(progressId, weekNumber) {
    return apiService.post(`/progress/${progressId}/uncomplete-week`, { weekNumber })
  }

  /**
   * Mark a week as completed for all students in a course
   */
  async bulkCompleteWeek(courseId, weekNumber) {
    return apiService.post(`/progress/course/${courseId}/bulk-complete-week`, { weekNumber })
  }
}

export const progressService = new ProgressService()
