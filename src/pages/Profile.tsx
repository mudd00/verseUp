import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/utils/constants'

type TabType = 'profile' | 'password' | 'danger'

export default function Profile() {
  const { user, logout, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  // Profile update state
  const [name, setName] = useState(user?.name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  // Password change state
  const [_currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  // Account deletion state
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(null)

    if (!name.trim()) {
      setProfileError('이름을 입력해주세요.')
      return
    }

    try {
      setProfileLoading(true)

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          avatar_url: avatarUrl.trim() || null,
        })
        .eq('id', user?.id)

      if (updateError) throw updateError

      // Update local user state
      if (user) {
        setUser({
          ...user,
          name: name.trim(),
          avatarUrl: avatarUrl.trim() || undefined,
        })
      }

      setProfileSuccess('프로필이 성공적으로 업데이트되었습니다.')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : '프로필 업데이트에 실패했습니다.')
    } finally {
      setProfileLoading(false)
    }
  }

  // Password change handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('새 비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    try {
      setPasswordLoading(true)

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setPasswordSuccess('비밀번호가 성공적으로 변경되었습니다.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Account deletion handler
  const handleAccountDeletion = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteError(null)

    if (deleteConfirmation !== '회원탈퇴') {
      setDeleteError('"회원탈퇴"를 정확히 입력해주세요.')
      return
    }

    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    try {
      setDeleteLoading(true)

      // Delete user account (this will cascade delete profile due to ON DELETE CASCADE)
      const { error } = await supabase.rpc('delete_user')

      if (error) throw error

      // Logout and redirect to home
      await logout()
      navigate(ROUTES.HOME)
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : '회원 탈퇴에 실패했습니다. 관리자에게 문의해주세요.'
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  const tabs = [
    { id: 'profile' as TabType, label: '프로필 정보', icon: '👤' },
    { id: 'password' as TabType, label: '비밀번호 변경', icon: '🔒' },
    { id: 'danger' as TabType, label: '계정 관리', icon: '⚠️' },
  ]

  return (
    <div className="min-h-[80vh] py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">계정 설정</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Information Tab */}
        {activeTab === 'profile' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6">프로필 정보</h2>

            {profileError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-200 text-sm">
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">이메일</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-400">이메일은 변경할 수 없습니다.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">역할</label>
                <div className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed">
                  {user?.role === 'student' && '🎓 학생'}
                  {user?.role === 'instructor' && '👨‍🏫 강사'}
                  {user?.role === 'admin' && '👑 관리자'}
                </div>
                <p className="mt-1 text-xs text-gray-400">역할은 관리자만 변경할 수 있습니다.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">프로필 이미지 URL (선택)</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? '저장 중...' : '변경사항 저장'}
              </button>
            </form>
          </div>
        )}

        {/* Password Change Tab */}
        {activeTab === 'password' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6">비밀번호 변경</h2>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-200 text-sm">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">새 비밀번호</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-400">최소 6자 이상 입력해주세요.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">새 비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="bg-gray-800 p-6 rounded-lg border-2 border-red-500/30">
            <h2 className="text-2xl font-bold mb-2 text-red-400">위험 구역</h2>
            <p className="text-gray-400 mb-6">
              이 작업들은 되돌릴 수 없습니다. 신중하게 진행해주세요.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleAccountDeletion} className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                <h3 className="font-bold text-red-400 mb-2">⚠️ 회원 탈퇴</h3>
                <p className="text-sm text-gray-300 mb-4">
                  계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다:
                </p>
                <ul className="text-sm text-gray-300 space-y-1 mb-4 list-disc list-inside">
                  <li>프로필 정보</li>
                  <li>수강 신청 기록 (학생인 경우)</li>
                  <li>생성한 강의 및 세션 (강사인 경우)</li>
                  <li>채팅 메시지</li>
                </ul>

                <label className="block text-sm font-medium mb-2">
                  계속하려면 <span className="text-red-400 font-bold">"회원탈퇴"</span>를 입력하세요:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="회원탈퇴"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500 mb-4"
                />

                <button
                  type="submit"
                  disabled={deleteLoading || deleteConfirmation !== '회원탈퇴'}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? '삭제 중...' : '계정 영구 삭제'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
