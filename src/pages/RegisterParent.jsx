import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { inviteService } from '@/services/inviteService'
import { parentService } from '@/services/parentService'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

export default function RegisterParent() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  // Step 1: Invite code verification
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '')
  const [studentInfo, setStudentInfo] = useState(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState('')

  // Step 2: Registration form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isRegistering, setIsRegistering] = useState(false)

  // Auto-validate code from URL
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      validateCode(code)
    }
  }, [searchParams])

  const validateCode = async (code) => {
    if (!code || code.length < 8) {
      setValidationError('초대 코드는 8자리입니다.')
      return
    }

    setIsValidating(true)
    setValidationError('')

    try {
      const result = await inviteService.validate(code)
      if (result.valid) {
        setStudentInfo(result.student)
        setInviteCode(code.toUpperCase())
      } else {
        setValidationError(result.error || '유효하지 않은 초대 코드입니다.')
      }
    } catch (error) {
      console.error('Validation error:', error)
      setValidationError('초대 코드 확인 중 오류가 발생했습니다.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    validateCode(inviteCode)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      toast.error('이름을 입력해주세요.')
      return
    }

    if (!formData.email.trim()) {
      toast.error('이메일을 입력해주세요.')
      return
    }

    if (formData.password.length < 6) {
      toast.error('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsRegistering(true)

    try {
      const result = await parentService.registerParent({
        inviteCode,
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      })

      if (result.token) {
        // Auto login
        login(result.user, result.token)
        toast.success(`환영합니다! ${result.student.name}님과 연결되었습니다.`)
        navigate(ROUTES.DASHBOARD)
      } else {
        toast.success('계정이 생성되었습니다. 로그인해주세요.')
        navigate(ROUTES.LOGIN)
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.message || '회원가입에 실패했습니다.')
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">부모 회원가입</h1>
          <p className="text-gray-400">
            자녀의 초대 코드로 부모 계정을 만들고 학습 현황을 확인하세요.
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          {!studentInfo ? (
            // Step 1: Code Verification
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  초대 코드
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC12XYZ"
                  maxLength={8}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl tracking-widest font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isValidating}
                />
                {validationError && (
                  <p className="mt-2 text-sm text-red-400">{validationError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isValidating || inviteCode.length < 8}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {isValidating ? '확인 중...' : '코드 확인'}
              </button>

              <p className="text-center text-sm text-gray-400">
                초대 코드가 없으신가요?{' '}
                <span className="text-gray-300">
                  자녀에게 초대 코드를 요청해주세요.
                </span>
              </p>
            </form>
          ) : (
            // Step 2: Registration Form
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Student Info Display */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-400 mb-1">연결할 자녀</p>
                <p className="text-lg font-medium text-white">{studentInfo.name}</p>
                <p className="text-sm text-gray-400">{studentInfo.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="홍길동"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isRegistering}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="parent@example.com"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isRegistering}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="최소 6자 이상"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isRegistering}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="비밀번호 재입력"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isRegistering}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStudentInfo(null)}
                  disabled={isRegistering}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  뒤로
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {isRegistering ? '가입 중...' : '가입하기'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-400">
              이미 계정이 있으신가요?{' '}
              <Link to={ROUTES.LOGIN} className="text-purple-400 hover:text-purple-300">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
