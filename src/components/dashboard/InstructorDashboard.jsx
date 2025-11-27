import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore.js'
import { courseService } from '@/services/courseService.js'
import { ROUTES } from '@/utils/constants.js'

export default function InstructorDashboard() {
  const { user } = useAuthStore()
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setIsLoading(true)
      const data = await courseService.getMyCourses()
      setCourses(data)
    } catch (err) {
      console.error('강의 목록 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 통계 계산
  const totalCourses = courses.length
  const totalStudents = courses.reduce((sum, course) => sum + (course.enrolledCount || 0), 0)
  const activeCourses = courses.filter(course => {
    const now = new Date()
    const startDate = new Date(course.startDate)
    const endDate = new Date(course.endDate)
    return startDate <= now && now <= endDate && course.status === 'active'
  }).length

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">강사 대시보드</h1>
        <Link
          to={ROUTES.CREATE_COURSE}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          + 새 강좌 개설
        </Link>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">환영합니다, {user?.name} 강사님!</h2>
        <p className="text-gray-400">역할: 강사</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">내 강의</h3>
          <p className="text-3xl font-bold text-blue-400">
            {isLoading ? '...' : totalCourses}
          </p>
          <p className="text-sm text-gray-400 mt-2">개설한 강의 수</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">총 수강인원</h3>
          <p className="text-3xl font-bold text-green-400">
            {isLoading ? '...' : `${totalStudents}명`}
          </p>
          <p className="text-sm text-gray-400 mt-2">전체 강의 기준</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">진행 중인 강의</h3>
          <p className="text-3xl font-bold text-purple-400">
            {isLoading ? '...' : activeCourses}
          </p>
          <p className="text-sm text-gray-400 mt-2">활성 강의</p>
        </div>
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">다가오는 수업</h3>
        <p className="text-gray-400">예정된 수업이 없습니다.</p>
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">내 강의 관리</h3>
          <Link
            to={ROUTES.MY_COURSES}
            className="text-blue-400 hover:text-blue-300 transition"
          >
            전체 보기 →
          </Link>
        </div>

        {isLoading ? (
          <p className="text-gray-400">로딩 중...</p>
        ) : courses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">개설한 강의가 없습니다.</p>
            <Link
              to={ROUTES.CREATE_COURSE}
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              첫 강의 개설하기
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {courses.slice(0, 3).map((course) => (
                <div
                  key={course.id}
                  className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition flex flex-col"
                >
                  <Link
                    to={`/courses/${course.id}`}
                    className="text-lg font-semibold hover:text-blue-400 transition mb-2"
                  >
                    {course.title}
                  </Link>
                  <p className="text-sm text-gray-400 mb-3 flex-1">
                    수강 인원: {course.enrolledCount} / {course.maxStudents}명
                  </p>
                  <Link
                    to={`/courses/${course.id}/edit`}
                    className="w-full text-center px-3 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded transition"
                  >
                    수정
                  </Link>
                </div>
              ))}
            </div>
            {courses.length > 3 && (
              <Link
                to={ROUTES.MY_COURSES}
                className="block text-center py-2 text-blue-400 hover:text-blue-300 transition"
              >
                {courses.length - 3}개 강의 더 보기 →
              </Link>
            )}
          </>
        )}
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">학생 활동</h3>
        <p className="text-gray-400">최근 학생 활동이 없습니다.</p>
      </div>
    </div>
  )
}
