import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()

    const mockUser = {
      id: '1',
      email,
      name: 'Test User',
      role: 'student',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const mockToken = 'mock-token-123'

    login(mockUser, mockToken)
    navigate(ROUTES.DASHBOARD)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">로그인</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            로그인
          </button>
        </form>

        <p className="mt-4 text-center text-gray-400">
          계정이 없으신가요?{' '}
          <Link to={ROUTES.REGISTER} className="text-blue-400 hover:text-blue-300">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
