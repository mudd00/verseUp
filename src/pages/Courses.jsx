import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { courseService } from '@/services/courseService.js'
import { formatSchedule } from '@/utils/scheduleFormatter.js'
import { COURSE_CATEGORIES, COURSE_LEVELS } from '@/utils/constants.js'

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [instructors, setInstructors] = useState([])
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    level: '',
    minPrice: 0,
    maxPrice: 1000000,
    instructorId: '',
  })

  useEffect(() => {
    loadInstructors()
  }, [])

  useEffect(() => {
    loadCourses()
  }, [filters])

  const loadInstructors = async () => {
    try {
      const data = await courseService.getInstructors()
      setInstructors(data)
    } catch (err) {
      console.error('강사 목록 로드 실패:', err)
    }
  }

  const loadCourses = async () => {
    try {
      setIsLoading(true)
      const data = await courseService.getCourses(filters)
      setCourses(data)
    } catch (err) {
      console.error('강의 목록 로드 실패:', err)
      setError('강의 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      level: '',
      minPrice: 0,
      maxPrice: 1000000,
      instructorId: '',
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getLevelBadge = (level) => {
    const badges = {
      beginner: { label: '초급', color: 'bg-green-600' },
      intermediate: { label: '중급', color: 'bg-yellow-600' },
      advanced: { label: '고급', color: 'bg-red-600' },
    }
    const badge = badges[level] || badges.beginner
    return <span className={`px-2 py-1 text-xs rounded-full ${badge.color} text-white`}>{badge.label}</span>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">강의 목록</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
        >
          {showFilters ? '필터 숨기기' : '필터 표시'}
        </button>
      </div>

      {showFilters && <CourseFilters filters={filters} onFilterChange={handleFilterChange} instructors={instructors} onReset={resetFilters} />}

      {/* Applied Filters Tags */}
      {(filters.category || filters.level || filters.instructorId || filters.search || filters.minPrice > 0 || filters.maxPrice < 1000000) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.search && (
            <span className="px-3 py-1 bg-blue-600 rounded-full text-sm flex items-center gap-2">
              검색: {filters.search}
              <button
                onClick={() => handleFilterChange('search', '')}
                className="text-white hover:text-gray-300 font-bold"
              >
                ×
              </button>
            </span>
          )}
          {filters.category && (
            <span className="px-3 py-1 bg-green-600 rounded-full text-sm flex items-center gap-2">
              {COURSE_CATEGORIES[filters.category]}
              <button
                onClick={() => handleFilterChange('category', '')}
                className="text-white hover:text-gray-300 font-bold"
              >
                ×
              </button>
            </span>
          )}
          {filters.level && (
            <span className="px-3 py-1 bg-yellow-600 rounded-full text-sm flex items-center gap-2">
              {COURSE_LEVELS[filters.level]}
              <button
                onClick={() => handleFilterChange('level', '')}
                className="text-white hover:text-gray-300 font-bold"
              >
                ×
              </button>
            </span>
          )}
          {filters.instructorId && (
            <span className="px-3 py-1 bg-purple-600 rounded-full text-sm flex items-center gap-2">
              강사: {instructors.find((i) => i.id === filters.instructorId)?.name}
              <button
                onClick={() => handleFilterChange('instructorId', '')}
                className="text-white hover:text-gray-300 font-bold"
              >
                ×
              </button>
            </span>
          )}
          {(filters.minPrice > 0 || filters.maxPrice < 1000000) && (
            <span className="px-3 py-1 bg-orange-600 rounded-full text-sm flex items-center gap-2">
              가격: {filters.minPrice.toLocaleString()}원 ~ {filters.maxPrice.toLocaleString()}원
              <button
                onClick={() => {
                  handleFilterChange('minPrice', 0)
                  handleFilterChange('maxPrice', 1000000)
                }}
                className="text-white hover:text-gray-300 font-bold"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">강의 목록을 불러오는 중...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400 text-lg">검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-gray-800 p-6 rounded-lg">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} className="w-full h-40 object-cover rounded-lg mb-4" />
              ) : (
                <div className="w-full h-40 bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-gray-500">이미지 없음</span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 font-mono">{course.courseCode}</span>
                {getLevelBadge(course.level)}
                {course.price === 0 && <span className="px-2 py-1 text-xs rounded-full bg-blue-600 text-white">무료</span>}
              </div>

              <h3 className="text-xl font-semibold mb-2">{course.title}</h3>

              <p className="text-gray-400 mb-2 text-sm">강사: {course.instructor?.name || '강사 정보 없음'}</p>

              <p className="text-gray-400 mb-4 line-clamp-2 text-sm">{course.description}</p>

              <div className="text-sm text-gray-500 mb-4 space-y-1">
                <p>
                  기간: {formatDate(course.startDate)} ~ {formatDate(course.endDate)}
                </p>
                {course.classroom && (
                  <p className="flex items-center gap-1">
                    <span>강의실:</span>
                    <span className="text-blue-400">{course.classroom.name}</span>
                  </p>
                )}
                {course.timeSlot ? (
                  <p>
                    시간: {['일', '월', '화', '수', '목', '금', '토'][course.timeSlot.day_of_week]}요일{' '}
                    {course.timeSlot.start_time?.substring(0, 5)} ~ {course.timeSlot.end_time?.substring(0, 5)}
                  </p>
                ) : (
                  <p>시간: {formatSchedule(course.schedule)}</p>
                )}
                <p>
                  수강 인원: {course.enrolledCount} / {course.maxStudents}명
                </p>
              </div>

              <Link to={`/courses/${course.id}`} className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition text-center">
                자세히 보기
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// CourseFilters Component
function CourseFilters({ filters, onFilterChange, instructors, onReset }) {
  const [isPriceCustom, setIsPriceCustom] = useState(false)

  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">필터</h2>
        <button onClick={onReset} className="text-sm text-blue-400 hover:text-blue-300">
          초기화
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">검색</label>
        <input
          type="text"
          placeholder="강의명 또는 설명 검색..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Price Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">가격</label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="priceType"
              checked={filters.minPrice === 0 && filters.maxPrice === 0}
              onChange={() => {
                onFilterChange('minPrice', 0)
                onFilterChange('maxPrice', 0)
                setIsPriceCustom(false)
              }}
              className="mr-2"
            />
            무료만
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="priceType"
              checked={filters.minPrice === 1 && filters.maxPrice === 1000000}
              onChange={() => {
                onFilterChange('minPrice', 1)
                onFilterChange('maxPrice', 1000000)
                setIsPriceCustom(false)
              }}
              className="mr-2"
            />
            유료만
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="priceType"
              checked={isPriceCustom}
              onChange={() => setIsPriceCustom(true)}
              className="mr-2"
            />
            사용자 지정
          </label>
          {isPriceCustom && (
            <div className="ml-6 space-y-2">
              <div>
                <label className="text-xs text-gray-400">최소 금액</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => onFilterChange('minPrice', Number(e.target.value))}
                  className="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">최대 금액</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => onFilterChange('maxPrice', Number(e.target.value))}
                  className="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructor Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">강사</label>
        <select
          value={filters.instructorId}
          onChange={(e) => onFilterChange('instructorId', e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="">전체 강사</option>
          {instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.name}
            </option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">카테고리</label>
        <select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="">전체 카테고리</option>
          {Object.entries(COURSE_CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Level Filter (nested under category) */}
      <div className={`mb-4 ${filters.category ? 'pl-4 border-l-2 border-blue-500' : ''}`}>
        <label className="block text-sm font-medium mb-2">
          난이도
          {filters.category && <span className="ml-2 text-xs text-gray-400">({COURSE_CATEGORIES[filters.category]} 내)</span>}
        </label>
        <div className="space-y-2">
          {Object.entries(COURSE_LEVELS).map(([key, label]) => (
            <label key={key} className="flex items-center">
              <input
                type="radio"
                name="level"
                checked={filters.level === key}
                onChange={() => onFilterChange('level', key)}
                className="mr-2"
              />
              {label}
            </label>
          ))}
          <label className="flex items-center">
            <input
              type="radio"
              name="level"
              checked={filters.level === ''}
              onChange={() => onFilterChange('level', '')}
              className="mr-2"
            />
            전체
          </label>
        </div>
      </div>
    </div>
  )
}
