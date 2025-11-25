import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { courseService } from '@/services/courseService'
import { enrollmentService } from '@/services/enrollmentService'
import { useAuthStore } from '@/stores/authStore'
import { formatSchedule } from '@/components/course/ScheduleInput'
import { ROUTES } from '@/utils/constants'

export default function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [course, setCourse] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id) {
      loadCourse()
      checkEnrollment()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadCourse = async () => {
    if (!id) return

    try {
      setIsLoading(true)
      const data = await courseService.getCourseById(id)
      setCourse(data)
    } catch (err) {
      console.error('강의 조회 실패:', err)
      setError('강의 정보를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const checkEnrollment = async () => {
    if (!id || !isAuthenticated) return

    try {
      const enrolled = await enrollmentService.isEnrolled(id)
      setIsEnrolled(enrolled)
    } catch (err) {
      console.error('수강 여부 확인 실패:', err)
    }
  }

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.')
      navigate(ROUTES.LOGIN)
      return
    }

    if (!id || !course) return

    if (user?.role === 'instructor') {
      toast.error('강사 계정으로는 수강 신청할 수 없습니다.')
      return
    }

    try {
      setIsEnrolling(true)
      await enrollmentService.enrollCourse(id)
      setIsEnrolled(true)
      toast.success('수강 신청이 완료되었습니다!')
      // 강의 정보 새로고침 (수강 인원 업데이트)
      await loadCourse()
    } catch (err) {
      const message = err instanceof Error ? err.message : '수강 신청에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleDrop = async () => {
    if (!id) return

    try {
      setIsEnrolling(true)
      await enrollmentService.dropCourse(id)
      setIsEnrolled(false)
      toast.success('수강이 취소되었습니다.')
      await loadCourse()
    } catch (err) {
      const message = err instanceof Error ? err.message : '수강 취소에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsEnrolling(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getLevelBadge = (level?) => {
    const badges = {
      beginner: { label: '초급', color: 'bg-green-600' },
      intermediate: { label: '중급', color: 'bg-yellow-600' },
      advanced: { label: '고급', color: 'bg-red-600' },
    }
    const badge = badges[level as keyof typeof badges] || badges.beginner
    return (
      
        {badge.label}
      
    )
  }

  const getCategoryLabel = (category?) => {
    const categories: Record = {
      programming: '프로그래밍',
      design: '디자인',
      business: '비즈니스',
      language: '언어',
      general: '일반',
    }
    return categories[category || 'general'] || category || '일반'
  }

  if (isLoading) {
    return (
      
        강의 정보를 불러오는 중...
      
    )
  }

  if (error || !course) {
    return (
      
        {error || '강의를 찾을 수 없습니다.'}
        <button
          onClick={() => navigate(ROUTES.COURSES)}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
        >
          강의 목록으로 돌아가기
        
      
    )
  }

  const isFull = course.enrolledCount >= course.maxStudents
  const isInstructor = user?.id === course.instructorId

  return (
    
      {/* 헤더 섹션 */}
      
        <button
          onClick={() => navigate(ROUTES.COURSES)}
          className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2"
        >
          ← 강의 목록으로
        

        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        ) : (
          
            강의 이미지
          
        )}

        
          
            {course.courseCode}
          
          {getLevelBadge(course.level)}
          
            {getCategoryLabel(course.category)}
          
          {course.price === 0 && (
            
              무료
            
          )}
        

        {course.title}

        
          강사: {course.instructor?.name || '강사 정보 없음'}
        
      

      {/* 메인 콘텐츠 */}
      
        {/* 강의 설명 */}
        
          
            강의 소개
            {course.description}
          

          
            강의 시간표
            {course.schedule && course.schedule.length > 0 ? (
              
                {course.schedule.map((schedule, index) => {
                  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
                  return (
                    
                      
                        {dayNames[schedule.dayOfWeek]}요일
                      
                      
                        {schedule.startTime} ~ {schedule.endTime}
                      
                    
                  )
                })}
              
            ) : (
              시간표가 설정되지 않았습니다.
            )}
          
        

        {/* 사이드바 - 수강 신청 정보 */}
        
          
            
              
                수강료
                
                  {course.price === 0 ? '무료' : `₩${course.price?.toLocaleString()}`}
                
              

              
                수강 기간
                
                  {formatDate(course.startDate)} ~ {formatDate(course.endDate)}
                
              

              
                강의 시간
                {formatSchedule(course.schedule)}
              

              
                수강 인원
                
                  
                    {course.enrolledCount}
                  {' '}
                  / {course.maxStudents}명
                  {isFull && (정원 마감)}
                
              
            

            {/* 수강 신청 버튼 */}
            {isInstructor ? (
              <button
                onClick={() => navigate(`/courses/${course.id}/edit`)}
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition"
              >
                강의 수정하기
              
            ) : isEnrolled ? (
              
                
                  수강 중인 강의입니다
                
                <button
                  onClick={handleDrop}
                  disabled={isEnrolling}
                  className="w-full px-6 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600 text-red-400 rounded-lg transition disabled:opacity-50"
                >
                  {isEnrolling ? '처리 중...' : '수강 취소'}
                
              
            ) : (
              <button
                onClick={handleEnroll}
                disabled={isEnrolling || isFull}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition ${
                  isFull
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {isEnrolling ? '처리 중...' : isFull ? '정원 마감' : '수강 신청하기'}
              
            )}

            {!isAuthenticated && (
              
                수강 신청을 위해{' '}
                <button
                  onClick={() => navigate(ROUTES.LOGIN)}
                  className="text-blue-400 hover:underline"
                >
                  로그인
                
                이 필요합니다.
              
            )}
          
        
      
    
  )
}
