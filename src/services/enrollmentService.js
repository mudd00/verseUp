import { useAuthStore } from '@/stores/authStore'
import { apiService } from '@/services/api'

class EnrollmentService {
  /**
   * 강의 수강 신청 (무료 강의용)
   * 유료 강의는 결제 프로세스를 통해 자동으로 수강 신청됨
   */
  async enrollCourse(courseId) {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      // 백엔드 API 사용 (Race condition 방지)
      const response = await apiService.post(`/courses/${courseId}/enroll`)

      if (response.enrollment) {
        return this.mapEnrollmentFromDB(response.enrollment)
      }

      return response
    } catch (error) {
      console.error('수강 신청 실패:', error)
      throw new Error(error.message || '수강 신청에 실패했습니다.')
    }
  }

  /**
   * 환불 정책 계산
   * @param {string} startDate - 강의 시작일
   * @returns {object} - { canRefund, refundRate, policyDescription }
   */
  calculateRefundPolicy(startDate) {
    const now = new Date()
    const courseStartDate = new Date(startDate)
    const daysUntilStart = Math.ceil((courseStartDate - now) / (1000 * 60 * 60 * 24))

    if (daysUntilStart >= 7) {
      return {
        canRefund: true,
        refundRate: 100,
        policyDescription: '강의 시작 7일 전 - 100% 환불',
        daysUntilStart,
      }
    } else if (daysUntilStart >= 0) {
      return {
        canRefund: true,
        refundRate: 70,
        policyDescription: '강의 시작 7일 이내 - 70% 환불',
        daysUntilStart,
      }
    } else {
      return {
        canRefund: false,
        refundRate: 0,
        policyDescription: '강의 시작 후 - 환불 불가',
        daysUntilStart,
      }
    }
  }

  /**
   * 수강 취소 및 환불 요청
   * @param {string} enrollmentId - 수강 신청 ID
   * @returns {Promise<object>} - 환불 결과
   */
  async refundEnrollment(enrollmentId) {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      const data = await apiService.post('/payments/refund', { enrollmentId })
      return data
    } catch (error) {
      console.error('환불 요청 실패:', error)
      throw new Error(error.message || '환불 처리에 실패했습니다.')
    }
  }

  /**
   * 내 수강 목록 조회
   */
  async getMyEnrollments() {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    try {
      const response = await apiService.get('/courses/enrollments/my')
      return response.enrollments.map((enrollment) => this.mapEnrollmentFromDB(enrollment))
    } catch (error) {
      console.error('수강 목록 조회 실패:', error)
      throw new Error('수강 목록을 불러오는데 실패했습니다.')
    }
  }

  /**
   * 특정 강의 수강 여부 확인
   */
  async isEnrolled(courseId) {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      return false
    }

    try {
      const response = await apiService.get(`/courses/${courseId}/enrollment-status`)
      return response.isEnrolled
    } catch (error) {
      console.error('수강 여부 확인 실패:', error)
      return false
    }
  }

  /**
   * DB 데이터를 Enrollment 타입으로 변환
   */
  mapEnrollmentFromDB(data) {
    const courseData = data.course
    let course

    if (courseData) {
      const instructor = courseData.instructor

      // time_slot 정보를 schedule 배열로 변환
      let schedule = courseData.schedule || []
      if (!schedule || schedule.length === 0) {
        // schedule이 비어있으면 time_slot에서 생성
        if (courseData.time_slot) {
          schedule = [
            {
              dayOfWeek: courseData.time_slot.day_of_week,
              startTime: courseData.time_slot.start_time,
              endTime: courseData.time_slot.end_time,
            },
          ]
        }
      }

      course = {
        id: courseData.id,
        courseCode: courseData.course_code,
        title: courseData.title,
        description: courseData.description,
        instructorId: courseData.instructor_id,
        instructor: instructor
          ? {
              id: instructor.id,
              name: instructor.name,
              email: instructor.email,
              avatarUrl: instructor.avatar_url,
              role: 'instructor',
              createdAt: '',
              updatedAt: '',
            }
          : undefined,
        thumbnail: courseData.thumbnail,
        maxStudents: courseData.max_students,
        enrolledCount: courseData.enrolled_count || 0,
        startDate: courseData.start_date,
        endDate: courseData.end_date,
        schedule: schedule,
        timeSlot: courseData.time_slot,
        category: courseData.category,
        level: courseData.level,
        status: courseData.status,
        price: courseData.price,
        createdAt: courseData.created_at,
        updatedAt: courseData.updated_at,
      }
    }

    return {
      id: data.id,
      studentId: data.student_id,
      courseId: data.course_id,
      course,
      status: data.status,
      enrolledAt: data.enrolled_at,
      completedAt: data.completed_at,
    }
  }
}

export const enrollmentService = new EnrollmentService()