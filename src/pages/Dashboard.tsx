import { useAuthStore } from '@/stores/authStore'
import StudentDashboard from '@/components/dashboard/StudentDashboard'
import InstructorDashboard from '@/components/dashboard/InstructorDashboard'

export default function Dashboard() {
  const { user } = useAuthStore()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    )
  }

  if (user.role === 'instructor') {
    return <InstructorDashboard />
  }

  if (user.role === 'admin') {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-8">관리자 대시보드</h1>
        <div className="bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-400">관리자 대시보드는 추후 구현 예정입니다.</p>
        </div>
      </div>
    )
  }

  return <StudentDashboard />
}
