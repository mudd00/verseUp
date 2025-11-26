import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { courseService } from '@/services/courseService.js'
import { enrollmentService } from '@/services/enrollmentService.js'
import { useAuthStore } from '@/stores/authStore.js'
import { formatSchedule } from '@/components/course/ScheduleInput.jsx'
import { ROUTES } from '@/utils/constants.js'

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

  const getLevelBadge = (level) => {
    const badges = {
      beginner: { label: '초급', color: 'bg-green-600' },
      intermediate: { label: '중급', color: 'bg-yellow-600' },
      advanced: { label: '고급', color: 'bg-red-600' },
    }
    const badge = badges[level] || badges.beginner
    return (
      <span className={`px-3 py-1 text-sm rounded-full ${badge.color} text-white`}>
        {badge.label}
      </span>
    )
  }

  const getCategoryLabel = (category) => {
    const categories = {
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">강의 정보를 불러오는 중...</p>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || '강의를 찾을 수 없습니다.'}</p>
        <button
          onClick={() => navigate(ROUTES.COURSES)}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
        >
          강의 목록으로 돌아가기
        </button>
      </div>
    )
  }

  const isFull = course.enrolledCount >= course.maxStudents
  const isInstructor = user?.id === course.instructorId

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 섹션 */}
      <div className="mb-8">
        <button
          onClick={() => navigate(ROUTES.COURSES)}
          className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2"
        >
          ← 강의 목록으로
        </button>

        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        ) : (
          <div className="w-full h-64 bg-gray-700 rounded-lg mb-6 flex items-center justify-center">
            <span className="text-gray-500 text-lg">강의 이미지</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm text-gray-400 font-mono bg-gray-700 px-2 py-1 rounded">
            {course.courseCode}
          </span>
          {getLevelBadge(course.level)}
          <span className="px-3 py-1 text-sm rounded-full bg-gray-600 text-white">
            {getCategoryLabel(course.category)}
          </span>
          {course.price === 0 && (
            <span className="px-3 py-1 text-sm rounded-full bg-blue-600 text-white">
              무료
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-4">{course.title}</h1>

        <p className="text-gray-400 mb-4">
          강사: {course.instructor?.name || '강사 정보 없음'}
        </p>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 강의 설명 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">강의 소개</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{course.description}</p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">강의 시간표</h2>
            {course.schedule && course.schedule.length > 0 ? (
              <ul className="space-y-2">
                {course.schedule.map((schedule, index) => {
                  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
                  return (
                    <li key={index} className="flex items-center gap-2 text-gray-300">
                      <span className="w-16 text-center bg-gray-700 px-2 py-1 rounded">
                        {dayNames[schedule.dayOfWeek]}요일
                      </span>
                      <span>
                        {schedule.startTime} ~ {schedule.endTime}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-gray-400">시간표가 설정되지 않았습니다.</p>
            )}
          </div>
        </div>

        {/* 사이드바 - 수강 신청 정보 */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 p-6 rounded-lg sticky top-6">
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-400">수강료</p>
                <p className="text-2xl font-bold text-blue-400">
                  {course.price === 0 ? '무료' : `₩${course.price?.toLocaleString()}`}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400">수강 기간</p>
                <p className="text-gray-300">
                  {formatDate(course.startDate)} ~ {formatDate(course.endDate)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400">강의 시간</p>
                <p className="text-gray-300">{formatSchedule(course.schedule)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400">수강 인원</p>
                <p className="text-gray-300">
                  <span className={isFull ? 'text-red-400' : 'text-green-400'}>
                    {course.enrolledCount}
                  </span>{' '}
                  / {course.maxStudents}명
                  {isFull && <span className="text-red-400 ml-2">(정원 마감)</span>}
                </p>
              </div>
            </div>

            {/* 수강 신청 버튼 */}
            {isInstructor ? (
              <button
                onClick={() => navigate(`/courses/${course.id}/edit`)}
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition"
              >
                강의 수정하기
              </button>
            ) : isEnrolled ? (
              <div className="space-y-3">
                <div className="px-6 py-3 bg-green-600/20 border border-green-600 rounded-lg text-center">
                  <p className="text-green-400 font-semibold">수강 중인 강의입니다</p>
                </div>
                <button
                  onClick={handleDrop}
                  disabled={isEnrolling}
                  className="w-full px-6 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600 text-red-400 rounded-lg transition disabled:opacity-50"
                >
                  {isEnrolling ? '처리 중...' : '수강 취소'}
                </button>
              </div>
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
              </button>
            )}

            {!isAuthenticated && (
              <p className="text-sm text-gray-400 mt-3 text-center">
                수강 신청을 위해{' '}
                <button
                  onClick={() => navigate(ROUTES.LOGIN)}
                  className="text-blue-400 hover:underline"
                >
                  로그인
                </button>
                이 필요합니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
