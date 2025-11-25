import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { courseService, UpdateCourseData } from '@/services/courseService'
import { ROUTES } from '@/utils/constants'
import ScheduleInput from '@/components/course/ScheduleInput'

export default function EditCourse() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseCode: '',
    category: 'general',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    maxStudents: 30,
    startDate: '',
    endDate: '',
    schedule: [] as CourseSchedule[],
    thumbnail: '',
    price: 0,
    status: 'draft' as 'draft' | 'published' | 'archived',
  })

  const handleScheduleChange = (schedules: CourseSchedule[]) => {
    setFormData((prev) => ({ ...prev, schedule: schedules }))
  }

  useEffect(() => {
    if (id) {
      loadCourse(id)
    }
  }, [id])

  const loadCourse = async (courseId) => {
    try {
      setIsFetching(true)
      const course = await courseService.getCourseById(courseId)

      // 날짜 형식 변환 (YYYY-MM-DD)
      const formatDateForInput = (dateString) => {
        return dateString.split('T')[0]
      }

      setFormData({
        title: course.title,
        description: course.description,
        courseCode: course.courseCode,
        category: course.category || 'general',
        level: course.level || 'beginner',
        maxStudents: course.maxStudents,
        startDate: formatDateForInput(course.startDate),
        endDate: formatDateForInput(course.endDate),
        schedule: course.schedule || [],
        thumbnail: course.thumbnail || '',
        price: course.price || 0,
        status: course.status || 'draft',
      })
    } catch (err) {
      console.error('강의 로드 실패:', err)
      setError('강의를 불러오는데 실패했습니다.')
    } finally {
      setIsFetching(false)
    }
  }

  const handleChange = (
    eChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'maxStudents' || name === 'price' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!id) {
        throw new Error('강의 ID가 없습니다.')
      }

      // 필수 필드 검증
      if (!formData.title || !formData.description) {
        throw new Error('강의명과 설명은 필수입니다.')
      }

      if (!formData.startDate || !formData.endDate) {
        throw new Error('시작일과 종료일은 필수입니다.')
      }

      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        throw new Error('종료일은 시작일보다 나중이어야 합니다.')
      }

      // 강의 업데이트
      const updateData: UpdateCourseData = {
        title: formData.title,
        description: formData.description,
        courseCode: formData.courseCode,
        category: formData.category,
        level: formData.level,
        maxStudents: formData.maxStudents,
        startDate: formData.startDate,
        endDate: formData.endDate,
        schedule: formData.schedule,
        thumbnail: formData.thumbnail || undefined,
        price: formData.price,
        status: formData.status,
      }

      const updatedCourse = await courseService.updateCourse(id, updateData)

      // 성공 토스트
      const statusText = updatedCourse.status === 'published' ? '공개' : updatedCourse.status === 'draft' ? '초안' : '보관됨'
      toast.success(
        `강의 "${updatedCourse.title}"이(가) 수정되었습니다!\n상태: ${statusText}`,
        {
          duration: 5000,
        }
      )

      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      console.error('강의 수정 실패:', err)
      setError(
        err instanceof Error ? err.message : '강의 수정에 실패했습니다.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      
        
          강의 정보를 불러오는 중...
        
      
    )
  }

  return (
    
      
        강의 수정
        강의 정보를 수정하세요
      

      {error && (
        
          {error}
        
      )}

      
        {/* 기본 정보 */}
        
          기본 정보

          
            
              
                강의명 *
              
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            

            
              
                수강번호
              
              <input
                type="text"
                name="courseCode"
                value={formData.courseCode}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                readOnly
              />
              
                수강번호는 수정할 수 없습니다
              
            

            
              
                강의 설명 *
              
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 min-h-[120px]"
                required
              />
            

            
              
                
                  카테고리
                
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  일반
                  프로그래밍
                  디자인
                  비즈니스
                  수학
                  과학
                  언어
                
              

              
                난이도
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  초급
                  중급
                  고급
                
              

              
                
                  최대 수강 인원
                
                <input
                  type="number"
                  name="maxStudents"
                  value={formData.maxStudents}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  min="1"
                  max="500"
                  required
                />
              
            

            
              
                강의 상태
              
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              >
                초안 (비공개)
                공개
                보관
              
              
                초안: 강의 목록에 표시되지 않음 | 공개: 모든 사용자에게 표시 | 보관: 더 이상 수강 신청 불가
              
            
          
        

        {/* 기간 및 시간표 */}
        
          기간 및 시간표

          
            
              
                
                  시작일 *
                
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              

              
                
                  종료일 *
                
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              
            

            {/* 강의 시간표 */}
            <ScheduleInput
              schedules={formData.schedule}
              onChange={handleScheduleChange}
            />
          
        

        {/* 가격 설정 */}
        
          가격 설정

          
            
              
                가격 (원)
              
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                min="0"
              />
            

            
              
                썸네일 URL
              
              <input
                type="url"
                name="thumbnail"
                value={formData.thumbnail}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            
          
        

        {/* 제출 버튼 */}
        
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            disabled={isLoading}
          >
            취소
          
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? '수정 중...' : '수정 완료'}
          
        
      
    
  )
}
