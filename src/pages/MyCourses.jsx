import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { courseService } from '@/services/courseService'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'
import { formatSchedule } from '@/components/course/ScheduleInput'
import toast from 'react-hot-toast'

export default function MyCourses() {
  const { user } = useAuthStore()
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 강사가 아니면 대시보드로 리다이렉트
  if (user?.role !== 'instructor' && user?.role !== 'admin') {
    return 
  }

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
      await loadMyCourses()
      toast.success(
        newStatus === 'published'
          ? '강의가 공개되었습니다.'
          : '강의가 비공개로 전환되었습니다.'
      )
    } catch (err) {
      console.error('상태 변경 실패:', err)
      toast.error('상태 변경에 실패했습니다.')
    }
  }

  const handleDelete = async (courseId, courseTitle) => {
    if (!confirm(`"${courseTitle}" 강의를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    try {
      await courseService.deleteCourse(courseId)
      await loadMyCourses()
      toast.success('강의가 삭제되었습니다.')
    } catch (err) {
      console.error('강의 삭제 실패:', err)
      toast.error('강의 삭제에 실패했습니다.')
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

  // 필터링된 강의 목록
  const filteredCourses = courses.filter((course) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'published' && course.status === 'published') ||
      (filter === 'draft' && course.status === 'draft')

    const matchesSearch =
      searchQuery === '' ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.courseCode?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesFilter && matchesSearch
  })

  // 통계
  const stats = {
    total: courses.length,
    published: courses.filter((c) => c.status === 'published').length,
    draft: courses.filter((c) => c.status === 'draft').length,
    totalStudents: courses.reduce((sum, c) => sum + (c.enrolledCount || 0), 0),
  }

  if (isLoading) {
    return (
      
        강의 목록을 불러오는 중...
      
    )
  }

  return (
    
      {/* 헤더 */}
      
        
          내 강의 관리
          
            개설한 강의를 관리하고 새로운 강의를 만들어보세요
          
        
        <Link
          to={ROUTES.CREATE_COURSE}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
        >
          + 새 강좌 개설
        
      

      {/* 통계 카드 */}
      
        
          전체 강의
          {stats.total}개
        
        
          공개 중
          {stats.published}개
        
        
          비공개
          {stats.draft}개
        
        
          총 수강생
          {stats.totalStudents}명
        
      

      {/* 필터 및 검색 */}
      
        
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            전체 ({stats.total})
          
          <button
            onClick={() => setFilter('published')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'published'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            공개 ({stats.published})
          
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'draft'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            비공개 ({stats.draft})
          
        
        
          <input
            type="text"
            placeholder="강의명 또는 수강번호로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        
      

      {/* 에러 메시지 */}
      {error && (
        
          {error}
        
      )}

      {/* 강의 목록 */}
      {filteredCourses.length === 0 ? (
        
          {courses.length === 0 ? (
            
              개설된 강의가 없습니다.
              <Link
                to={ROUTES.CREATE_COURSE}
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                첫 강의 만들기
              
            
          ) : (
            검색 결과가 없습니다.
          )}
        
      ) : (
        
          {filteredCourses.map((course) => (
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
                  
                
                
                  강의 시간
                  
                    {formatSchedule(course.schedule)}
                  
                
              

              
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
        
      )}
    
  )
}
