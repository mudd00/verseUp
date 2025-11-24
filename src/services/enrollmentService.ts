import { supabase } from '@/lib/supabase'
import { Enrollment, Course } from '@/types'
import { useAuthStore } from '@/stores/authStore'

class EnrollmentService {
  /**
   * 강의 수강 신청
   */
  async enrollCourse(courseId: string): Promise<Enrollment> {
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
   * 수강 취소
   */
  async dropCourse(courseId: string): Promise<void> {
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

    // 강의의 enrolled_count 감소
    const { data: course } = await supabase
      .from('courses')
      .select('enrolled_count')
      .eq('id', courseId)
      .single()

    if (course && course.enrolled_count > 0) {
      await supabase
        .from('courses')
        .update({ enrolled_count: course.enrolled_count - 1 })
        .eq('id', courseId)
    }
  }

  /**
   * 내 수강 목록 조회
   */
  async getMyEnrollments(): Promise<Enrollment[]> {
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
  async isEnrolled(courseId: string): Promise<boolean> {
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
  private mapEnrollmentFromDB(data: Record<string, unknown>): Enrollment {
    const courseData = data.course as Record<string, unknown> | undefined
    let course: Course | undefined

    if (courseData) {
      const instructor = courseData.instructor as Record<string, unknown> | undefined
      course = {
        id: courseData.id as string,
        courseCode: courseData.course_code as string,
        title: courseData.title as string,
        description: courseData.description as string,
        instructorId: courseData.instructor_id as string,
        instructor: instructor
          ? {
              id: instructor.id as string,
              name: instructor.name as string,
              email: instructor.email as string,
              avatarUrl: instructor.avatar_url as string | undefined,
              role: 'instructor' as const,
              createdAt: '',
              updatedAt: '',
            }
          : undefined,
        thumbnail: courseData.thumbnail as string | undefined,
        maxStudents: courseData.max_students as number,
        enrolledCount: (courseData.enrolled_count as number) || 0,
        startDate: courseData.start_date as string,
        endDate: courseData.end_date as string,
        schedule: (courseData.schedule as Course['schedule']) || [],
        category: courseData.category as string | undefined,
        level: courseData.level as Course['level'],
        status: courseData.status as Course['status'],
        price: courseData.price as number | undefined,
        createdAt: courseData.created_at as string,
        updatedAt: courseData.updated_at as string | undefined,
      }
    }

    return {
      id: data.id as string,
      studentId: data.student_id as string,
      courseId: data.course_id as string,
      course,
      status: data.status as Enrollment['status'],
      enrolledAt: data.enrolled_at as string,
      completedAt: data.completed_at as string | undefined,
    }
  }
}

export const enrollmentService = new EnrollmentService()
