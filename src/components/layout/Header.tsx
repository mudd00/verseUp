import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.HOME)
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
                데시보드
              </Link>
              <Link
                to={ROUTES.COURSES}
                className="text-gray-300 hover:text-white transition"
              >
                강의목록
              </Link>
              <Link
                to={ROUTES.METAVERSE}
                className="text-gray-300 hover:text-white transition"
              >
                메타버스
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-gray-300">{user?.name}</span>
                <Link
                  to={ROUTES.PROFILE}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                >
                  설정
                </Link>
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
