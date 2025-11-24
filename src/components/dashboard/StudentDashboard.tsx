import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { enrollmentService } from '@/services/enrollmentService'
import { Enrollment, CourseSchedule } from '@/types'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

// 오늘의 요일 인덱스 (0=일요일)
const TODAY_DAY_INDEX = new Date().getDay()

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  // 전체 시간표 생성 (요일별로 그룹화)
  const getWeeklySchedule = () => {
    const scheduleByDay: { [key: number]: { course: string; schedule: CourseSchedule }[] } = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    }

    enrollments.forEach((enrollment) => {
      if (enrollment.course?.schedule) {
        enrollment.course.schedule.forEach((schedule) => {
          scheduleByDay[schedule.dayOfWeek].push({
            course: enrollment.course!.title,
            schedule,
          })
        })
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
                    {item.schedule.startTime} ~ {item.schedule.endTime}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                to={`/courses/${enrollment.courseId}`}
                className="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
              >
                <h4 className="font-semibold mb-1">{enrollment.course?.title}</h4>
                <p className="text-sm text-gray-400 mb-2">
                  {enrollment.course?.instructor?.name || '강사 정보 없음'}
                </p>
                {enrollment.course?.schedule && enrollment.course.schedule.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {enrollment.course.schedule
                      .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}`)
                      .join(', ')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 주간 시간표 */}
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">주간 시간표</h3>
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
                        className="text-xs p-1 bg-blue-600/30 rounded"
                        title={item.course}
                      >
                        <p className="truncate font-medium">{item.course}</p>
                        <p className="text-gray-400">
                          {item.schedule.startTime}
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
    </div>
  )
}
