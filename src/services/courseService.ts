import { supabase } from '@/lib/supabase'
import { Course } from '@/types'

export interface CreateCourseData {
  title: string
  description: string
  courseCode?: string
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  maxStudents: number
  startDate: string
  endDate: string
  thumbnail?: string
  price?: number
}

export interface UpdateCourseData extends Partial<CreateCourseData> {
  status?: 'draft' | 'published' | 'archived'
}

class CourseService {
  /**
   * 새 강의 생성 (강사용)
   */
  async createCourse(data: CreateCourseData): Promise<Course> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('로그인이 필요합니다.')
    }

    // 강사 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'instructor' && profile?.role !== 'admin') {
      throw new Error('강사 권한이 필요합니다.')
    }

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        title: data.title,
        description: data.description,
        course_code: data.courseCode,
        category: data.category || 'general',
        level: data.level || 'beginner',
        instructor_id: user.id,
        max_students: data.maxStudents,
        start_date: data.startDate,
        end_date: data.endDate,
        thumbnail: data.thumbnail,
        price: data.price || 0,
        status: 'draft',
      })
      .select(
        `
        *,
        instructor:profiles!instructor_id(id, name, email, avatar_url)
      `
      )
      .single()

    if (error) {
      console.error('강의 생성 실패:', error)
      throw new Error('강의 생성에 실패했습니다.')
    }

    return this.mapCourseFromDB(course)
  }

  /**
   * 강의 목록 조회 (공개된 강의만)
   */
  async getCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(
        `
        *,
        instructor:profiles!instructor_id(id, name, email, avatar_url)
      `
      )
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('강의 목록 조회 실패:', error)
      throw new Error('강의 목록을 불러오는데 실패했습니다.')
    }

    return data.map((course) => this.mapCourseFromDB(course))
  }

  /**
   * 내 강의 목록 조회 (강사용)
   */
  async getMyCourses(): Promise<Course[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('로그인이 필요합니다.')
    }

    const { data, error } = await supabase
      .from('courses')
      .select(
        `
        *,
        instructor:profiles!instructor_id(id, name, email, avatar_url)
      `
      )
      .eq('instructor_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('내 강의 조회 실패:', error)
      throw new Error('강의 목록을 불러오는데 실패했습니다.')
    }

    return data.map((course) => this.mapCourseFromDB(course))
  }

  /**
   * 강의 상세 조회
   */
  async getCourseById(id: string): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .select(
        `
        *,
        instructor:profiles!instructor_id(id, name, email, avatar_url)
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      console.error('강의 조회 실패:', error)
      throw new Error('강의를 찾을 수 없습니다.')
    }

    return this.mapCourseFromDB(data)
  }

  /**
   * 강의 업데이트 (강사/관리자용)
   */
  async updateCourse(id: string, data: UpdateCourseData): Promise<Course> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('로그인이 필요합니다.')
    }

    const updateData: Record<string, unknown> = {}
    if (data.title) updateData.title = data.title
    if (data.description) updateData.description = data.description
    if (data.courseCode) updateData.course_code = data.courseCode
    if (data.category) updateData.category = data.category
    if (data.level) updateData.level = data.level
    if (data.maxStudents) updateData.max_students = data.maxStudents
    if (data.startDate) updateData.start_date = data.startDate
    if (data.endDate) updateData.end_date = data.endDate
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail
    if (data.price !== undefined) updateData.price = data.price
    if (data.status) updateData.status = data.status

    const { data: course, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        instructor:profiles!instructor_id(id, name, email, avatar_url)
      `
      )
      .single()

    if (error) {
      console.error('강의 업데이트 실패:', error)
      throw new Error('강의 업데이트에 실패했습니다.')
    }

    return this.mapCourseFromDB(course)
  }

  /**
   * 강의 삭제 (강사/관리자용)
   */
  async deleteCourse(id: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('로그인이 필요합니다.')
    }

    const { error } = await supabase.from('courses').delete().eq('id', id)

    if (error) {
      console.error('강의 삭제 실패:', error)
      throw new Error('강의 삭제에 실패했습니다.')
    }
  }

  /**
   * 강의 공개 (draft → published)
   */
  async publishCourse(id: string): Promise<Course> {
    return this.updateCourse(id, { status: 'published' })
  }

  /**
   * DB 데이터를 Course 타입으로 변환
   */
  private mapCourseFromDB(data: any): Course {
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
            role: 'instructor' as const,
            createdAt: '',
            updatedAt: '',
          }
        : undefined,
      thumbnail: data.thumbnail,
      maxStudents: data.max_students,
      enrolledCount: data.enrolled_count || 0,
      startDate: data.start_date,
      endDate: data.end_date,
      category: data.category,
      level: data.level,
      status: data.status,
      price: data.price,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }
}

export const courseService = new CourseService()
