import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { inviteService } from '@/services/inviteService'

export default function InviteCodeManager() {
  const [invites, setInvites] = useState([])
  const [connectedParents, setConnectedParents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [invitesRes, parentsRes] = await Promise.all([
        inviteService.getMyInvites(),
        inviteService.getConnectedParents(),
      ])
      setInvites(invitesRes.invites || [])
      setConnectedParents(parentsRes.parents || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('데이터를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateCode = async () => {
    setIsGenerating(true)
    try {
      const result = await inviteService.generate()
      toast.success('초대 코드가 생성되었습니다!')
      setInvites((prev) => [
        {
          id: Date.now(),
          inviteCode: result.inviteCode,
          status: 'pending',
          expiresAt: result.expiresAt,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
    } catch (error) {
      console.error('Error generating code:', error)
      toast.error(error.message || '초대 코드 생성에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('초대 코드가 복사되었습니다!')
  }

  const handleRevokeCode = async (code) => {
    if (!confirm('이 초대 코드를 취소하시겠습니까?')) return

    try {
      await inviteService.revoke(code)
      toast.success('초대 코드가 취소되었습니다.')
      setInvites((prev) =>
        prev.map((invite) =>
          invite.inviteCode === code ? { ...invite, status: 'revoked' } : invite
        )
      )
    } catch (error) {
      console.error('Error revoking code:', error)
      toast.error(error.message || '초대 코드 취소에 실패했습니다.')
    }
  }

  const handleDisconnectParent = async (linkId, parentName) => {
    if (!confirm(`${parentName}님과의 연결을 해제하시겠습니까?`)) return

    try {
      await inviteService.disconnectParent(linkId)
      toast.success('연결이 해제되었습니다.')
      setConnectedParents((prev) => prev.filter((p) => p.linkId !== linkId))
    } catch (error) {
      console.error('Error disconnecting parent:', error)
      toast.error(error.message || '연결 해제에 실패했습니다.')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date()
  }

  const pendingInvites = invites.filter(
    (invite) => invite.status === 'pending' && !isExpired(invite.expiresAt)
  )

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">부모 계정 연결</h3>
        <button
          onClick={handleGenerateCode}
          disabled={isGenerating || pendingInvites.length >= 3}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isGenerating ? '생성 중...' : '초대 코드 생성'}
        </button>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400">대기 중인 초대 코드</h4>
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-center gap-4">
                <code className="px-3 py-1 bg-gray-900 rounded text-lg font-mono text-purple-400 tracking-wider">
                  {invite.inviteCode}
                </code>
                <div className="text-sm text-gray-400">
                  만료: {formatDate(invite.expiresAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(invite.inviteCode)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="복사"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleRevokeCode(invite.inviteCode)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  title="취소"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connected Parents */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-400">연결된 부모</h4>
        {connectedParents.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            연결된 부모 계정이 없습니다.
          </p>
        ) : (
          connectedParents.map((parent) => (
            <div
              key={parent.linkId}
              className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {parent.name?.charAt(0) || 'P'}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">{parent.name}</p>
                  <p className="text-sm text-gray-400">{parent.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {formatDate(parent.connectedAt)}
                </span>
                <button
                  onClick={() => handleDisconnectParent(parent.linkId, parent.name)}
                  className="px-3 py-1 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                >
                  연결 해제
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">사용 방법</h4>
        <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
          <li>위에서 초대 코드를 생성하세요.</li>
          <li>생성된 코드를 부모님께 전달해주세요.</li>
          <li>
            부모님이{' '}
            <code className="px-1 py-0.5 bg-gray-800 rounded text-purple-400">
              /register-parent
            </code>{' '}
            페이지에서 코드를 입력하고 가입하시면 됩니다.
          </li>
          <li>연결된 부모님은 학습 현황을 확인할 수 있습니다.</li>
        </ol>
      </div>
    </div>
  )
}
