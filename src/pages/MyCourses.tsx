import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { courseService } from '@/services/courseService'
import { Course } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'
import { formatSchedule } from '@/components/course/ScheduleInput'
import toast from 'react-hot-toast'

export default function MyCourses() {
  const { user } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 강사가 아니면 대시보드로 리다이렉트
  if (user?.role !== 'instructor' && user?.role !== 'admin') {
    return <Navigate to={ROUTES.DASHBOARD} replace />
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

  const handleToggleStatus = async (courseId: string, currentStatus?: string) => {
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

  const handleDelete = async (courseId: string, courseTitle: string) => {
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

  const getStatusBadge = (status?: string) => {
    const badges = {
      draft: { label: '초안', color: 'bg-gray-600' },
      published: { label: '공개', color: 'bg-green-600' },
      archived: { label: '보관', color: 'bg-yellow-600' },
    }
    const badge = badges[status as keyof typeof badges] || badges.draft
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.color} text-white`}>
        {badge.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">강의 목록을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">내 강의 관리</h1>
          <p className="text-gray-400 mt-2">
            개설한 강의를 관리하고 새로운 강의를 만들어보세요
          </p>
        </div>
        <Link
          to={ROUTES.CREATE_COURSE}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
        >
          <span className="text-xl">+</span> 새 강좌 개설
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">전체 강의</p>
          <p className="text-2xl font-bold text-white">{stats.total}개</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">공개 중</p>
          <p className="text-2xl font-bold text-green-400">{stats.published}개</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">비공개</p>
          <p className="text-2xl font-bold text-gray-400">{stats.draft}개</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">총 수강생</p>
          <p className="text-2xl font-bold text-blue-400">{stats.totalStudents}명</p>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            전체 ({stats.total})
          </button>
          <button
            onClick={() => setFilter('published')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'published'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            공개 ({stats.published})
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'draft'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            비공개 ({stats.draft})
          </button>
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="강의명 또는 수강번호로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 mb-6 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* 강의 목록 */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-lg">
          {courses.length === 0 ? (
            <>
              <p className="text-gray-400 mb-4 text-lg">개설된 강의가 없습니다.</p>
              <Link
                to={ROUTES.CREATE_COURSE}
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                첫 강의 만들기
              </Link>
            </>
          ) : (
            <p className="text-gray-400 text-lg">검색 결과가 없습니다.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-gray-800 p-6 rounded-lg hover:bg-gray-750 transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{course.title}</h3>
                    {getStatusBadge(course.status)}
                  </div>
                  <p className="text-sm text-gray-400 font-mono mb-2">
                    수강번호: {course.courseCode}
                  </p>
                  <p className="text-gray-400 line-clamp-2 mb-3">{course.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">수강 인원</span>
                  <p className="text-white font-semibold">
                    {course.enrolledCount} / {course.maxStudents}명
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">난이도</span>
                  <p className="text-white font-semibold">
                    {course.level === 'beginner' && '초급'}
                    {course.level === 'intermediate' && '중급'}
                    {course.level === 'advanced' && '고급'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">가격</span>
                  <p className="text-white font-semibold">
                    {course.price === 0 ? '무료' : `${course.price?.toLocaleString()}원`}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">기간</span>
                  <p className="text-white font-semibold text-xs">
                    {formatDate(course.startDate)} ~<br />
                    {formatDate(course.endDate)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">강의 시간</span>
                  <p className="text-white font-semibold text-xs">
                    {formatSchedule(course.schedule)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`${ROUTES.COURSES}/${course.id}/edit`}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-center rounded transition"
                >
                  수정
                </Link>
                <button
                  onClick={() => handleToggleStatus(course.id, course.status)}
                  className={`flex-1 px-4 py-2 rounded transition ${
                    course.status === 'published'
                      ? 'bg-yellow-600 hover:bg-yellow-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {course.status === 'published' ? '비공개로 전환' : '공개하기'}
                </button>
                <button
                  onClick={() => handleDelete(course.id, course.title)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
