import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore.js'
import { courseService } from '@/services/courseService.js'
import { ROUTES } from '@/utils/constants.js'

export default function InstructorDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    activeCourses: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await courseService.getInstructorStats()
      setStats(data)
    } catch (err) {
      console.error('통계 조회 실패:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">내 강의</h3>
          {loading ? (
            <p className="text-2xl text-gray-400">로딩 중...</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-blue-400">{stats.totalCourses}</p>
              <p className="text-sm text-gray-400 mt-2">개설한 강의 수</p>
            </>
          )}
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">총 수강인원</h3>
          {loading ? (
            <p className="text-2xl text-gray-400">로딩 중...</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-green-400">{stats.totalStudents}명</p>
              <p className="text-sm text-gray-400 mt-2">전체 강의 기준</p>
            </>
          )}
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">진행 중인 강의</h3>
          {loading ? (
            <p className="text-2xl text-gray-400">로딩 중...</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-purple-400">{stats.activeCourses}</p>
              <p className="text-sm text-gray-400 mt-2">활성 강의</p>
            </>
          )}
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
        <p className="text-gray-400 mb-4">
          강의 목록 관리, 공개/비공개 설정, 수정 및 삭제는 "내 강의 관리" 페이지에서 할 수 있습니다.
        </p>
        <Link
          to={ROUTES.MY_COURSES}
          className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        >
          내 강의 관리로 이동
        </Link>
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">학생 활동</h3>
        <p className="text-gray-400">최근 학생 활동이 없습니다.</p>
      </div>
    </div>
  )
}
