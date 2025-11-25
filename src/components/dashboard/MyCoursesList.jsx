import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseService } from '@/services/courseService'
import { ROUTES } from '@/utils/constants'

export default function MyCoursesList() {
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMyCourses()
  }, [])

  const loadMyCourses = async () => {
    try {
      setIsLoading(true)
      const data = await courseService.getMyCourses()
      setCourses(data)
    } catch (err) {
      console.error('내 강의 로드 실패:', err)
      setError('강의 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (courseId, currentStatus?) => {
    try {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published'
      await courseService.updateCourse(courseId, { status: newStatus })

      // 목록 새로고침
      await loadMyCourses()

      alert(
        newStatus === 'published'
          ? '강의가 공개되었습니다.'
          : '강의가 비공개로 전환되었습니다.'
      )
    } catch (err) {
      console.error('상태 변경 실패:', err)
      alert('상태 변경에 실패했습니다.')
    }
  }

  const handleDelete = async (courseId, courseTitle) => {
    if (!confirm(`"${courseTitle}" 강의를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    try {
      await courseService.deleteCourse(courseId)
      await loadMyCourses()
      alert('강의가 삭제되었습니다.')
    } catch (err) {
      console.error('강의 삭제 실패:', err)
      alert('강의 삭제에 실패했습니다.')
    }
  }

  const getStatusBadge = (status?) => {
    const badges = {
      draft: { label: '초안', color: 'bg-gray-600' },
      published: { label: '공개', color: 'bg-green-600' },
      archived: { label: '보관', color: 'bg-yellow-600' },
    }
    const badge = badges[status as keyof typeof badges] || badges.draft
    return (
      
        {badge.label}
      
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      
        강의 목록을 불러오는 중...
      
    )
  }

  if (error) {
    return (
      
        {error}
      
    )
  }

  if (courses.length === 0) {
    return (
      
        개설된 강의가 없습니다.
        <Link
          to={ROUTES.CREATE_COURSE}
          className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          첫 강의 만들기
        
      
    )
  }

  return (
    
      {courses.map((course) => (
        <div
          key={course.id}
          className="bg-gray-800 p-6 rounded-lg hover:bg-gray-750 transition"
        >
          
            
              
                {course.title}
                {getStatusBadge(course.status)}
              
              
                수강번호: {course.courseCode}
              
              
                {course.description}
              
            
          

          
            
              수강 인원
              
                {course.enrolledCount} / {course.maxStudents}명
              
            
            
              난이도
              
                {course.level === 'beginner' && '초급'}
                {course.level === 'intermediate' && '중급'}
                {course.level === 'advanced' && '고급'}
              
            
            
              가격
              
                {course.price === 0 ? '무료' : `${course.price?.toLocaleString()}원`}
              
            
            
              기간
              
                {formatDate(course.startDate)} ~
                {formatDate(course.endDate)}
              
            
          

          
            <Link
              to={`${ROUTES.COURSES}/${course.id}/edit`}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-center rounded transition"
            >
              수정
            
            <button
              onClick={() => handleToggleStatus(course.id, course.status)}
              className={`flex-1 px-4 py-2 rounded transition ${
                course.status === 'published'
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {course.status === 'published' ? '비공개로 전환' : '공개하기'}
            
            <button
              onClick={() => handleDelete(course.id, course.title)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
            >
              삭제
            
          
        
      ))}
    
  )
}
