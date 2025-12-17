import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore.js'
import { enrollmentService } from '@/services/enrollmentService.js'
import toast from 'react-hot-toast'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

// 오늘의 날짜 및 요일
const TODAY = new Date()
const TODAY_DAY_INDEX = TODAY.getDay()
const TODAY_DATE = `${TODAY.getMonth() + 1}/${TODAY.getDate()}`

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const [enrollments, setEnrollments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [refundModalData, setRefundModalData] = useState(null)
  const [isRefunding, setIsRefunding] = useState(false)

  useEffect(() => {
    loadEnrollments()
  }, [])

  const loadEnrollments = async () => {
    try {
      setIsLoading(true)
      const data = await enrollmentService.getMyEnrollments()
      setEnrollments(data)
    } catch (err) {
      console.error('수강 목록 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 시간 포맷 변환 (08:00:00 -> 08:00)
  const formatTime = (time) => {
    if (!time) return ''
    return time.substring(0, 5)
  }

  // 날짜 포맷 변환 (2025-12-24 -> 12/24)
  const formatShortDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 강의 상태 확인 함수
  const getCourseStatus = (course) => {
    if (!course.startDate || !course.endDate) {
      return 'ongoing' // 날짜 정보가 없으면 진행중으로 간주
    }

    const now = new Date()
    const startDate = new Date(course.startDate)
    const endDate = new Date(course.endDate)

    if (now < startDate) {
      return 'upcoming' // 예정
    } else if (now >= startDate && now <= endDate) {
      return 'ongoing' // 진행중
    } else {
      return 'completed' // 완료
    }
  }

  // 전체 시간표 생성 (요일별로 그룹화)
  const getWeeklySchedule = () => {
    const scheduleByDay = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    }

    // 진행중인 강의와 예정 강의를 분리
    const ongoingCourses = []
    const upcomingCourses = []

    enrollments.forEach((enrollment) => {
      const course = enrollment.course
      if (!course) return

      const status = getCourseStatus(course)
      if (status === 'completed') {
        return // 완료된 강의는 표시하지 않음
      }

      // timeSlot 사용 (우선순위)
      if (course.timeSlot) {
        const item = {
          course: course.title,
          schedule: {
            dayOfWeek: course.timeSlot.day_of_week,
            startTime: course.timeSlot.start_time,
            endTime: course.timeSlot.end_time,
          },
          status,
          startDate: course.startDate,
        }

        const dayOfWeek = course.timeSlot.day_of_week

        if (status === 'ongoing') {
          ongoingCourses.push({ dayOfWeek, item })
        } else if (status === 'upcoming') {
          upcomingCourses.push({ dayOfWeek, item })
        }
      }
      // schedule 배열 사용 (fallback)
      else if (course.schedule && course.schedule.length > 0) {
        course.schedule.forEach((schedule) => {
          const item = {
            course: course.title,
            schedule,
            status,
            startDate: course.startDate,
          }

          if (status === 'ongoing') {
            ongoingCourses.push({ dayOfWeek: schedule.dayOfWeek, item })
          } else if (status === 'upcoming') {
            upcomingCourses.push({ dayOfWeek: schedule.dayOfWeek, item })
          }
        })
      }
    })

    // 진행중인 강의를 먼저 시간표에 추가
    ongoingCourses.forEach(({ dayOfWeek, item }) => {
      scheduleByDay[dayOfWeek].push(item)
    })

    // 예정된 강의는 같은 요일/시간에 진행중인 강의가 없을 때만 추가
    upcomingCourses.forEach(({ dayOfWeek, item }) => {
      const hasOngoingAtSameTime = scheduleByDay[dayOfWeek].some(
        (existingItem) =>
          existingItem.status === 'ongoing' &&
          existingItem.schedule.startTime === item.schedule.startTime
      )

      if (!hasOngoingAtSameTime) {
        scheduleByDay[dayOfWeek].push(item)
      }
    })

    // 각 요일 내에서 시간순 정렬
    Object.keys(scheduleByDay).forEach((day) => {
      scheduleByDay[Number(day)].sort((a, b) =>
        a.schedule.startTime.localeCompare(b.schedule.startTime)
      )
    })

    return scheduleByDay
  }

  // 오늘의 강의 목록
  const getTodaySchedule = () => {
    return getWeeklySchedule()[TODAY_DAY_INDEX]
  }

  const weeklySchedule = getWeeklySchedule()
  const todaySchedule = getTodaySchedule()

  // 환불 모달 열기
  const openRefundModal = (enrollment) => {
    const policy = enrollmentService.calculateRefundPolicy(enrollment.course.startDate)
    setRefundModalData({
      enrollment,
      policy,
    })
  }

  // 환불 처리
  const handleRefund = async () => {
    if (!refundModalData) return

    try {
      setIsRefunding(true)
      await enrollmentService.refundEnrollment(refundModalData.enrollment.id)

      toast.success('환불이 완료되었습니다.')
      setRefundModalData(null)
      loadEnrollments() // 목록 새로고침
    } catch (error) {
      console.error('환불 실패:', error)
      toast.error(error.message || '환불에 실패했습니다.')
    } finally {
      setIsRefunding(false)
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">대시보드</h1>

      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">환영합니다, {user?.name}님!</h2>
        <p className="text-gray-400">역할: 학생</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">수강 중인 강의</h3>
          <p className="text-3xl font-bold text-blue-400">{enrollments.length}</p>
          <p className="text-sm text-gray-400 mt-2">현재 수강 중</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">오늘 강의</h3>
          <p className="text-3xl font-bold text-green-400">{todaySchedule.length}</p>
          <p className="text-sm text-gray-400 mt-2">{DAY_NAMES[TODAY_DAY_INDEX]}요일</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">과제</h3>
          <p className="text-3xl font-bold text-purple-400">0</p>
          <p className="text-sm text-gray-400 mt-2">제출 대기 중</p>
        </div>
      </div>

      {/* 오늘의 강의 */}
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">
          오늘의 강의 ({DAY_NAMES[TODAY_DAY_INDEX]}요일)
        </h3>
        {isLoading ? (
          <p className="text-gray-400">로딩 중...</p>
        ) : todaySchedule.length === 0 ? (
          <p className="text-gray-400">오늘은 예정된 강의가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {todaySchedule.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="font-medium">{item.course}</p>
                  <p className="text-sm text-gray-400">
                    {formatTime(item.schedule.startTime)} ~ {formatTime(item.schedule.endTime)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 수강 중인 강의 목록 */}
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">수강 중인 강의</h3>
          <Link
            to="/courses"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            강의 더 찾아보기 →
          </Link>
        </div>
        {isLoading ? (
          <p className="text-gray-400">로딩 중...</p>
        ) : enrollments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">수강 중인 강의가 없습니다.</p>
            <Link
              to="/courses"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition inline-block"
            >
              강의 둘러보기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="p-4 bg-gray-700 rounded-lg"
              >
                <Link
                  to={`/courses/${enrollment.courseId}`}
                  className="block hover:text-blue-400 transition"
                >
                  <h4 className="font-semibold mb-1">{enrollment.course?.title}</h4>
                  <p className="text-sm text-gray-400 mb-2">
                    {enrollment.course?.instructor?.name || '강사 정보 없음'}
                  </p>
                  {enrollment.course?.schedule && enrollment.course.schedule.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {enrollment.course.schedule
                        .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${formatTime(s.startTime)} ~ ${formatTime(s.endTime)}`)
                        .join(', ')}
                    </p>
                  )}
                  {enrollment.course?.timeSlot && !enrollment.course.schedule?.length && (
                    <p className="text-xs text-gray-500">
                      {DAY_NAMES[enrollment.course.timeSlot.day_of_week]} {formatTime(enrollment.course.timeSlot.start_time)} ~ {formatTime(enrollment.course.timeSlot.end_time)}
                    </p>
                  )}
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    openRefundModal(enrollment)
                  }}
                  className="mt-3 w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition"
                >
                  수강 취소 및 환불
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 주간 시간표 */}
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-semibold">주간 시간표</h3>
          <div className="text-sm text-gray-400">
            {TODAY_DATE} ({DAY_NAMES[TODAY_DAY_INDEX]}요일)
          </div>
        </div>
        {isLoading ? (
          <p className="text-gray-400">로딩 중...</p>
        ) : enrollments.length === 0 ? (
          <p className="text-gray-400">수강 중인 강의가 없어 시간표가 비어있습니다.</p>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {DAY_NAMES.map((day, dayIndex) => (
              <div key={dayIndex} className="min-h-[120px]">
                <div
                  className={`text-center p-2 rounded-t font-medium ${
                    dayIndex === TODAY_DAY_INDEX
                      ? 'bg-blue-600'
                      : 'bg-gray-700'
                  }`}
                >
                  {day}
                </div>
                <div className="bg-gray-700/50 rounded-b p-2 space-y-1 min-h-[100px]">
                  {weeklySchedule[dayIndex].length === 0 ? (
                    <p className="text-xs text-gray-500 text-center">-</p>
                  ) : (
                    weeklySchedule[dayIndex].map((item, index) => (
                      <div
                        key={index}
                        className={`text-xs p-1 rounded ${
                          item.status === 'upcoming'
                            ? 'bg-yellow-600/30 border border-yellow-500/50'
                            : 'bg-blue-600/30'
                        }`}
                        title={item.course}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate font-medium flex-1">{item.course}</p>
                          {item.status === 'upcoming' && (
                            <div className="flex items-center gap-1">
                              <span className="px-1 py-0.5 bg-yellow-500 text-black rounded text-[10px] font-semibold whitespace-nowrap">
                                예정
                              </span>
                              <span className="text-[10px] text-yellow-300 whitespace-nowrap">
                                {formatShortDate(item.startDate)}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-gray-400">
                          {formatTime(item.schedule.startTime)} ~ {formatTime(item.schedule.endTime)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 환불 확인 모달 */}
      {refundModalData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">수강 취소 및 환불</h3>

            <div className="mb-6">
              <p className="text-gray-300 mb-2">
                <span className="font-semibold">강의:</span>{' '}
                {refundModalData.enrollment.course?.title}
              </p>
              <p className="text-gray-300 mb-4">
                <span className="font-semibold">가격:</span>{' '}
                ₩{refundModalData.enrollment.course?.price?.toLocaleString()}
              </p>

              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-4">
                <p className="text-blue-400 font-semibold mb-2">환불 정책</p>
                <p className="text-sm text-gray-300 mb-1">
                  {refundModalData.policy.policyDescription}
                </p>
                <p className="text-sm text-gray-400">
                  강의 시작까지 {Math.abs(refundModalData.policy.daysUntilStart)}일{' '}
                  {refundModalData.policy.daysUntilStart >= 0 ? '남음' : '지남'}
                </p>
              </div>

              {refundModalData.policy.canRefund ? (
                <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                  <p className="text-green-400 font-semibold mb-1">환불 예상 금액</p>
                  <p className="text-2xl font-bold text-green-400">
                    ₩
                    {Math.floor(
                      ((refundModalData.enrollment.course?.price || 0) *
                        refundModalData.policy.refundRate) /
                        100
                    ).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    (환불율 {refundModalData.policy.refundRate}%)
                  </p>
                </div>
              ) : (
                <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
                  <p className="text-red-400 font-semibold">환불 불가</p>
                  <p className="text-sm text-gray-300 mt-1">
                    강의가 이미 시작되어 환불이 불가능합니다.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRefundModalData(null)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition"
                disabled={isRefunding}
              >
                취소
              </button>
              {refundModalData.policy.canRefund && (
                <button
                  onClick={handleRefund}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isRefunding}
                >
                  {isRefunding ? '처리 중...' : '환불 신청'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
