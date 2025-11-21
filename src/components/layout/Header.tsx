import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to={ROUTES.HOME} className="text-2xl font-bold text-white">
          VerseUp!
        </Link>

        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <Link
                to={ROUTES.DASHBOARD}
                className="text-gray-300 hover:text-white transition"
              >
                Dashboard
              </Link>
              <Link
                to={ROUTES.COURSES}
                className="text-gray-300 hover:text-white transition"
              >
                Courses
              </Link>
              <Link
                to={ROUTES.METAVERSE}
                className="text-gray-300 hover:text-white transition"
              >
                Metaverse
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-gray-300">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to={ROUTES.LOGIN}
                className="text-gray-300 hover:text-white transition"
              >
                로그인
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
