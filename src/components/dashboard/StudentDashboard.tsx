import { useAuthStore } from '@/stores/authStore'

export default function StudentDashboard() {
  const { user } = useAuthStore()

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
          <p className="text-3xl font-bold text-blue-400">0</p>
          <p className="text-sm text-gray-400 mt-2">현재 수강 중</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">출석률</h3>
          <p className="text-3xl font-bold text-green-400">0%</p>
          <p className="text-sm text-gray-400 mt-2">전체 강의 기준</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">과제</h3>
          <p className="text-3xl font-bold text-purple-400">0</p>
          <p className="text-sm text-gray-400 mt-2">제출 대기 중</p>
        </div>
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">다가오는 일정</h3>
        <p className="text-gray-400">예정된 강의가 없습니다.</p>
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">최근 활동</h3>
        <p className="text-gray-400">최근 활동이 없습니다.</p>
      </div>
    </div>
  )
}
