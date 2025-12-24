import { useAuthStore } from '@/stores/authStore.js'
import StudentDashboard from '@/components/dashboard/StudentDashboard.jsx'
import InstructorDashboard from '@/components/dashboard/InstructorDashboard.jsx'
import AdminDashboard from '@/components/dashboard/AdminDashboard.jsx'
import ParentDashboard from '@/components/dashboard/ParentDashboard.jsx'

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
    return <AdminDashboard />
  }

  if (user.role === 'parent') {
    return <ParentDashboard />
  }

  return <StudentDashboard />
}
