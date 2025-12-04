import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { apiService } from '@/services/api'

class EnrollmentService {
  /**
   * 강의 수강 신청
   */
  async enrollCourse(courseId) {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    // 이미 수강 중인지 확인
    const { data: existing } = await supabase
      .from('enrollments')
      .select('*')
      .eq('student_id', currentUser.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .single()

    if (existing) {
      throw new Error('이미 수강 중인 강의입니다.')
    }

    // 강의 정원 확인
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('max_students, enrolled_count')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      throw new Error('강의 정보를 찾을 수 없습니다.')
    }

    if (course.enrolled_count >= course.max_students) {
      throw new Error('수강 정원이 초과되었습니다.')
    }

    // 수강 신청 생성
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .insert({
        student_id: currentUser.id,
        course_id: courseId,
        status: 'active',
        enrolled_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      console.error('수강 신청 실패:', error)
      throw new Error('수강 신청에 실패했습니다.')
    }

    // DB 트리거가 enrolled_count를 자동으로 증가시킴
    return this.mapEnrollmentFromDB(enrollment)
  }

  /**
   * 수강 취소 (더 이상 사용 안 함 - refundEnrollment 사용)
   * @deprecated - 환불 정책이 적용된 refundEnrollment를 사용하세요
   */
  async dropCourse(courseId) {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'dropped' })
      .eq('student_id', currentUser.id)
      .eq('course_id', courseId)
      .eq('status', 'active')

    if (error) {
      console.error('수강 취소 실패:', error)
      throw new Error('수강 취소에 실패했습니다.')
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

    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
        *,
        course:courses(
          *,
          instructor:profiles!instructor_id(id, name, email, avatar_url)
        )
      `
      )
      .eq('student_id', currentUser.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })

    if (error) {
      console.error('수강 목록 조회 실패:', error)
      throw new Error('수강 목록을 불러오는데 실패했습니다.')
    }

    return data.map((enrollment) => this.mapEnrollmentFromDB(enrollment))
  }

  /**
   * 특정 강의 수강 여부 확인
   */
  async isEnrolled(courseId) {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      return false
    }

    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', currentUser.id)
      .eq('course_id', courseId)
      .eq('status', 'active')
      .single()

    return !!data
  }

  /**
   * DB 데이터를 Enrollment 타입으로 변환
   */
  mapEnrollmentFromDB(data) {
    const courseData = data.course
    let course

    if (courseData) {
      const instructor = courseData.instructor
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
        schedule: courseData.schedule || [],
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