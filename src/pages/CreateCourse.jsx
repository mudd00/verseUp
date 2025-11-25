import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { courseService, CreateCourseData } from '@/services/courseService'
import { ROUTES } from '@/utils/constants'
import ScheduleInput from '@/components/course/ScheduleInput'

export default function CreateCourse() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseCode: '',
    category: 'general',
    level: 'beginner',
    maxStudents: 30,
    startDate: '',
    endDate: '',
    schedule: [],
    thumbnail: '',
    price: 0,
  })

  const handleScheduleChange = (schedules: CourseSchedule[]) => {
    setFormData((prev) => ({ ...prev, schedule: schedules }))
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

      // 강의 생성
      const course = await courseService.createCourse(formData)

      // 성공 토스트
      toast.success(
        `강의 "${course.title}"이(가) 생성되었습니다!\n강의코드: ${course.courseCode}`,
        {
          duration: 5000,
        }
      )

      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      console.error('강의 생성 실패:', err)
      setError(
        err instanceof Error ? err.message : '강의 생성에 실패했습니다.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    
      
        새 강의 개설
        새로운 강의를 생성하고 학생들을 모집하세요
      

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
                placeholder="예: React 완벽 가이드"
                required
              />
            

            
              
                수강번호 (선택사항)
              
              <input
                type="text"
                name="courseCode"
                value={formData.courseCode}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="비워두면 자동 생성됩니다 (예: REA123)"
              />
              
                비워두면 강의명을 기반으로 자동 생성됩니다
              
            

            
              
                강의 설명 *
              
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 min-h-[120px]"
                placeholder="강의에 대한 자세한 설명을 입력하세요"
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
              schedules={formData.schedule || []}
              onChange={handleScheduleChange}
            />
          
        

        {/* 가격 및 썸네일 */}
        
          가격 설정

          
            
              
                가격 (원)
              
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                min="0"
                placeholder="0원 (무료)"
              />
              
                0원으로 설정하면 무료 강의입니다
              
            

            
              
                썸네일 URL (선택사항)
              
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
            {isLoading ? '생성 중...' : '강의 생성'}
          
        
      
    
  )
}
