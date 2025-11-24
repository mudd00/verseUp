import { useAuthStore } from '@/stores/authStore'

export default function Dashboard() {
  const { user } = useAuthStore()

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">환영합니다, {user?.name}님</h2>
        <p className="text-gray-400">역할: {user?.role}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">진행 중인 강의</h3>
          <p className="text-3xl font-bold text-blue-400">0</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">출석률</h3>
          <p className="text-3xl font-bold text-green-400">0%</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">과제</h3>
          <p className="text-3xl font-bold text-purple-400">0</p>
        </div>
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">다가오는 일정</h3>
        <p className="text-gray-400">예정된 강의가 없습니다.</p>
      </div>
    </div>
  )
}
