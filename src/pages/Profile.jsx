import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/utils/constants'


export default function Profile() {
  const { user, logout, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')

  // Profile update state
  const [name, setName] = useState(user?.name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState(null)

  // Password change state
  const [_currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(null)

  // Account deletion state
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Profile update handler
  const handleProfileUpdate = async (e) => {
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
  const handlePasswordChange = async (e) => {
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
  const handleAccountDeletion = async (e) => {
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
    
      
        계정 설정

        {/* Tabs */}
        
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
              {tab.icon}
              {tab.label}
            
          ))}
        

        {/* Profile Information Tab */}
        {activeTab === 'profile' && (
          
            프로필 정보

            {profileError && (
              
                {profileError}
              
            )}

            {profileSuccess && (
              
                {profileSuccess}
              
            )}

            
              
                이메일
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
                이메일은 변경할 수 없습니다.
              

              
                역할
                
                  {user?.role === 'student' && '🎓 학생'}
                  {user?.role === 'instructor' && '👨‍🏫 강사'}
                  {user?.role === 'admin' && '👑 관리자'}
                
                역할은 관리자만 변경할 수 있습니다.
              

              
                이름
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              

              
                프로필 이미지 URL (선택)
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
              

              <button
                type="submit"
                disabled={profileLoading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? '저장 중...' : '변경사항 저장'}
              
            
          
        )}

        {/* Password Change Tab */}
        {activeTab === 'password' && (
          
            비밀번호 변경

            {passwordError && (
              
                {passwordError}
              
            )}

            {passwordSuccess && (
              
                {passwordSuccess}
              
            )}

            
              
                새 비밀번호
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
                최소 6자 이상 입력해주세요.
              

              
                새 비밀번호 확인
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? '변경 중...' : '비밀번호 변경'}
              
            
          
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          
            위험 구역
            
              이 작업들은 되돌릴 수 없습니다. 신중하게 진행해주세요.
            

            {deleteError && (
              
                {deleteError}
              
            )}

            
              
                ⚠️ 회원 탈퇴
                
                  계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다:
                
                
                  프로필 정보
                  수강 신청 기록 (학생인 경우)
                  생성한 강의 및 세션 (강사인 경우)
                  채팅 메시지
                

                
                  계속하려면 "회원탈퇴"를 입력하세요:
                
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
                
              
            
          
        )}
      
    
  )
}
