import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'
import MyCoursesList from './MyCoursesList'

export default function InstructorDashboard() {
  const { user } = useAuthStore()

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
          <p className="text-3xl font-bold text-blue-400">0</p>
          <p className="text-sm text-gray-400 mt-2">개설한 강의 수</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">총 수강인원</h3>
          <p className="text-3xl font-bold text-green-400">0명</p>
          <p className="text-sm text-gray-400 mt-2">전체 강의 기준</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">진행 중인 강의</h3>
          <p className="text-3xl font-bold text-purple-400">0</p>
          <p className="text-sm text-gray-400 mt-2">활성 강의</p>
        </div>
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">다가오는 수업</h3>
        <p className="text-gray-400">예정된 수업이 없습니다.</p>
      </div>

      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-4">내 강의 목록</h3>
        <MyCoursesList />
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">학생 활동</h3>
        <p className="text-gray-400">최근 학생 활동이 없습니다.</p>
      </div>
    </div>
  )
}
