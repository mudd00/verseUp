import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore.js'

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
