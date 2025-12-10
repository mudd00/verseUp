import { apiService } from './api'

class ClassroomService {
  async getClassrooms() {
    const response = await apiService.get('/classrooms')
    return response.classrooms
  }

  async getClassroom(id) {
    const response = await apiService.get(`/classrooms/${id}`)
    return response.classroom
  }

  async getAvailableSlots(classroomId, startDate, weeks) {
    const response = await apiService.post(`/classrooms/${classroomId}/available-slots`, {
      startDate,
      weeks,
    })
    return response.timeSlots
  }

  async createClassroom(data) {
    const response = await apiService.post('/classrooms', data)
    return response.classroom
  }

  async updateClassroom(id, data) {
    const response = await apiService.put(`/classrooms/${id}`, data)
    return response.classroom
  }
}

export const classroomService = new ClassroomService()
