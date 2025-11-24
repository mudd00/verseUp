import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseService } from '@/services/courseService'
import { Course } from '@/types'
import { formatSchedule } from '@/components/course/ScheduleInput'

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setIsLoading(true)
      const data = await courseService.getCourses()
      setCourses(data)
    } catch (err) {
      console.error('강의 목록 로드 실패:', err)
      setError('강의 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getLevelBadge = (level?: string) => {
    const badges = {
      beginner: { label: '초급', color: 'bg-green-600' },
      intermediate: { label: '중급', color: 'bg-yellow-600' },
      advanced: { label: '고급', color: 'bg-red-600' },
    }
    const badge = badges[level as keyof typeof badges] || badges.beginner
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${badge.color} text-white`}
      >
        {badge.label}
      </span>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">강의 목록</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="강의 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">강의 목록을 불러오는 중...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400 text-lg">
            {searchQuery
              ? '검색 결과가 없습니다.'
              : '등록된 강의가 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-gray-800 p-6 rounded-lg">
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-40 object-cover rounded-lg mb-4"
                />
              ) : (
                <div className="w-full h-40 bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-gray-500">이미지 없음</span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 font-mono">
                  {course.courseCode}
                </span>
                {getLevelBadge(course.level)}
                {course.price === 0 && (
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-600 text-white">
                    무료
                  </span>
                )}
              </div>

              <h3 className="text-xl font-semibold mb-2">{course.title}</h3>

              <p className="text-gray-400 mb-2 text-sm">
                강사: {course.instructor?.name || '강사 정보 없음'}
              </p>

              <p className="text-gray-400 mb-4 line-clamp-2 text-sm">
                {course.description}
              </p>

              <div className="text-sm text-gray-500 mb-4 space-y-1">
                <p>기간: {formatDate(course.startDate)} ~ {formatDate(course.endDate)}</p>
                <p>시간: {formatSchedule(course.schedule)}</p>
                <p>
                  수강 인원: {course.enrolledCount} / {course.maxStudents}명
                </p>
              </div>

              <Link
                to={`/courses/${course.id}`}
                className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition text-center"
              >
                자세히 보기
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
