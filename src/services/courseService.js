import { useAuthStore } from '@/stores/authStore'
import { apiService } from './api'

class CourseService {
  /**
   * 새 강의 생성 (강의실 시간표 시스템 사용)
   */
  async createCourse(data) {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    // 강사 권한 확인
    if (currentUser.role !== 'instructor' && currentUser.role !== 'admin') {
      throw new Error('강사 권한이 필요합니다.')
    }

    try {
      const response = await apiService.post('/courses', {
        title: data.title,
        description: data.description,
        classroomId: data.classroomId,
        timeSlotId: data.timeSlotId,
        weeks: data.weeks,
        maxStudents: data.maxStudents || 20,
        startDate: data.startDate,
        thumbnail: data.thumbnail || '',
        price: data.price || 0,
      })

      return this.mapCourseFromAPI(response.course)
    } catch (error) {
      console.error('강의 생성 실패:', error)

      if (error.message.includes('409')) {
        throw new Error('선택한 시간대에 이미 다른 강의가 있습니다.')
      }

      throw new Error('강의 생성에 실패했습니다.')
    }
  }

  /**
   * 강의 목록 조회 (공개된 강의만, 필터링 지원)
   */
  async getCourses(filters = {}) {
    try {
      const params = new URLSearchParams()

      // Add filter parameters
      if (filters.search) params.append('search', filters.search)
      if (filters.category) params.append('category', filters.category)
      if (filters.level) params.append('level', filters.level)
      if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString())
      if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString())
      if (filters.instructorId) params.append('instructorId', filters.instructorId)

      const queryString = params.toString()
      const endpoint = queryString ? `/courses?${queryString}` : '/courses'

      const response = await apiService.get(endpoint)
      return response.courses.map((course) => this.mapCourseFromAPI(course))
    } catch (error) {
      console.error('강의 목록 조회 실패:', error)
      throw new Error('강의 목록을 불러오는데 실패했습니다.')
    }
  }

  /**
   * 강사 목록 조회 (필터용)
   */
  async getInstructors() {
    try {
      const response = await apiService.get('/courses/instructors')
      return response.instructors || []
    } catch (error) {
      console.error('강사 목록 조회 실패:', error)
      throw new Error('강사 목록을 불러오는데 실패했습니다.')
    }
  }

  /**
   * 내 강의 목록 조회 (강사용)
   */
  async getMyCourses() {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      const response = await apiService.get('/courses/my')
      return response.courses.map((course) => this.mapCourseFromAPI(course))
    } catch (error) {
      console.error('내 강의 조회 실패:', error)
      throw new Error('강의 목록을 불러오는데 실패했습니다.')
    }
  }

  /**
   * 강의 상세 조회
   */
  async getCourseById(id) {
    try {
      const response = await apiService.get(`/courses/${id}`)
      return this.mapCourseFromAPI(response.course)
    } catch (error) {
      console.error('강의 조회 실패:', error)
      throw new Error('강의를 찾을 수 없습니다.')
    }
  }

  /**
   * 강의 업데이트 (강사/관리자용)
   */
  async updateCourse(id, data) {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      const updateData = {}
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.maxStudents !== undefined) updateData.maxStudents = data.maxStudents
      if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail
      if (data.price !== undefined) updateData.price = data.price
      if (data.status !== undefined) updateData.status = data.status

      const response = await apiService.put(`/courses/${id}`, updateData)
      return this.mapCourseFromAPI(response.course)
    } catch (error) {
      console.error('강의 업데이트 실패:', error)
      throw new Error('강의 업데이트에 실패했습니다.')
    }
  }

  /**
   * 강의 삭제 (강사/관리자용)
   */
  async deleteCourse(id) {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      await apiService.delete(`/courses/${id}`)
    } catch (error) {
      console.error('강의 삭제 실패:', error)

      // 백엔드에서 에러 메시지를 반환하면 그대로 사용
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }

      throw new Error('강의 삭제에 실패했습니다.')
    }
  }

  /**
   * 강의 공개 (draft → published)
   */
  async publishCourse(id) {
    return this.updateCourse(id, { status: 'published' })
  }

  /**
   * 강사 통계 조회 (강사 대시보드용)
   */
  async getInstructorStats() {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    // 강사 권한 확인
    if (currentUser.role !== 'instructor' && currentUser.role !== 'admin') {
      throw new Error('강사 권한이 필요합니다.')
    }

    try {
      const response = await apiService.get('/courses/instructors/stats')
      return {
        totalCourses: response.totalCourses,
        totalStudents: response.totalStudents,
        activeCourses: response.activeCourses,
      }
    } catch (error) {
      console.error('강사 통계 조회 실패:', error)
      throw new Error('통계 정보를 불러오는데 실패했습니다.')
    }
  }

  /**
   * 강의 자료 업로드 - 백엔드 API 사용 (POST /api/courses/:courseId/materials/upload)
   * 이 메서드는 더 이상 사용되지 않습니다. 대신 백엔드 API를 직접 호출하세요.
   * @deprecated Use backend API POST /api/courses/:courseId/materials/upload instead
   */
  async uploadMaterial(courseId, materialData) {
    throw new Error('이 메서드는 더 이상 사용되지 않습니다. 백엔드 API를 직접 사용하세요.')
  }

  /**
   * DB 데이터를 Course 타입으로 변환
   */
  mapCourseFromDB(data) {
    return {
      id: data.id,
      courseCode: data.course_code,
      title: data.title,
      description: data.description,
      instructorId: data.instructor_id,
      instructor: data.instructor
        ? {
            id: data.instructor.id,
            name: data.instructor.name,
            email: data.instructor.email,
            avatarUrl: data.instructor.avatar_url,
            role: 'instructor',
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
      thumbnail: data.thumbnail,
      maxStudents: data.max_students,
      enrolledCount: data.enrolled_count || 0,
      startDate: data.start_date,
      endDate: data.end_date,
      schedule: data.schedule || [],
      classroom: data.classroom,
      timeSlot: data.time_slot,
      schedules: data.schedules,
      weeks: data.weeks,
      category: data.category,
      level: data.level,
      status: data.status,
      price: data.price,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  /**
   * API 응답 데이터를 Course 타입으로 변환
   */
  mapCourseFromAPI(data) {
    return {
      id: data.id,
      courseCode: data.course_code,
      title: data.title,
      description: data.description,
      instructorId: data.instructor_id,
      instructor: data.instructor
        ? {
            id: data.instructor.id,
            name: data.instructor.name,
            email: data.instructor.email,
            avatarUrl: data.instructor.avatar_url,
            role: 'instructor',
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
      thumbnail: data.thumbnail,
      maxStudents: data.max_students,
      enrolledCount: data.enrolled_count || 0,
      startDate: data.start_date,
      endDate: data.end_date,
      classroom: data.classroom,
      timeSlot: data.time_slot,
      weeks: data.weeks,
      status: data.status,
      price: data.price,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }
}

export const courseService = new CourseService()