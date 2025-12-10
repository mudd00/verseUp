import { supabase } from '@/lib/supabase'
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
   * 강의 목록 조회 (공개된 강의만)
   */
  async getCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select(
        `
        *,
        instructor:profiles!instructor_id(id, name, email, avatar_url),
        classroom:classrooms(id, name, description, capacity),
        time_slot:time_slots(id, day_of_week, start_time, end_time, slot_order)
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
  async getMyCourses() {
    // zustand store에서 인증된 사용자 정보 가져오기
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    const { data, error } = await supabase
      .from('courses')
      .select(
        `
        *,
        instructor:profiles!instructor_id(id, name, email, avatar_url),
        classroom:classrooms(id, name, description, capacity),
        time_slot:time_slots(id, day_of_week, start_time, end_time, slot_order)
      `
      )
      .eq('instructor_id', currentUser.id)
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
  async getCourseById(id) {
    const { data, error } = await supabase
      .from('courses')
      .select(
        `
        *,
        instructor:profiles!instructor_id(id, name, email, avatar_url),
        classroom:classrooms(id, name, description, capacity),
        time_slot:time_slots(id, day_of_week, start_time, end_time, slot_order),
        schedules:course_schedules(id, week_number, session_date, start_time, end_time, status)
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
  async updateCourse(id, data) {
    // zustand store에서 인증된 사용자 정보 가져오기
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    const updateData = {}
    if (data.title) updateData.title = data.title
    if (data.description) updateData.description = data.description
    if (data.courseCode) updateData.course_code = data.courseCode
    if (data.category) updateData.category = data.category
    if (data.level) updateData.level = data.level
    if (data.maxStudents) updateData.max_students = data.maxStudents
    if (data.startDate) updateData.start_date = data.startDate
    if (data.endDate) updateData.end_date = data.endDate
    if (data.schedule !== undefined) updateData.schedule = data.schedule
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
  async deleteCourse(id) {
    // zustand store에서 인증된 사용자 정보 가져오기
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    // 수강생 확인
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('enrolled_count')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('강의 조회 실패:', fetchError)
      throw new Error('강의 정보를 가져오는데 실패했습니다.')
    }

    if (course && course.enrolled_count > 0) {
      throw new Error('수강 중인 학생이 있어 삭제할 수 없습니다. 먼저 모든 수강생의 수강을 취소해주세요.')
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

    // 내 강의 목록 조회
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, status, enrolled_count, start_date, end_date')
      .eq('instructor_id', currentUser.id)

    if (coursesError) {
      console.error('강사 통계 조회 실패:', coursesError)
      throw new Error('통계 정보를 불러오는데 실패했습니다.')
    }

    // 통계 계산
    const totalCourses = courses.length
    const totalStudents = courses.reduce((sum, course) => sum + (course.enrolled_count || 0), 0)

    // 진행 중인 강의 (현재 날짜 기준으로 start_date <= 현재 <= end_date)
    const now = new Date()
    const activeCourses = courses.filter((course) => {
      if (course.status !== 'published') return false
      const startDate = new Date(course.start_date)
      const endDate = new Date(course.end_date)
      return startDate <= now && now <= endDate
    }).length

    return {
      totalCourses,
      totalStudents,
      activeCourses,
    }
  }

  /**
   * 강의 자료 업로드
   */
  async uploadMaterial(courseId, materialData) {
    const currentUser = useAuthStore.getState().user

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    // Generate unique file path
    const fileExt = materialData.file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${courseId}/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-materials')
      .upload(filePath, materialData.file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error('파일 업로드에 실패했습니다.')
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('course-materials').getPublicUrl(filePath)

    // Save metadata to database
    const { data: material, error } = await supabase
      .from('course_materials')
      .insert({
        course_id: courseId,
        title: materialData.title,
        description: materialData.description,
        file_url: publicUrl,
        file_name: materialData.file_name,
        file_size: materialData.file_size,
        file_type: materialData.file_type,
        uploaded_by: currentUser.id,
      })
      .select()
      .single()

    if (error) {
      console.error('자료 메타데이터 저장 실패:', error)
      throw new Error('자료 정보 저장에 실패했습니다.')
    }

    return material
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