import { useState, useEffect } from 'react'
import { socketService } from '@/services/socket'

/**
 * CCTV Control Panel for Instructors
 *
 * Allows instructors to enable/disable CCTV for their classroom
 * and see how many parents are currently viewing.
 */
export default function CCTVControl({ classroomId }) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Check connection status
    setIsConnected(socketService.isConnected())

    // Request current status
    if (classroomId) {
      socketService.emit('cctv:status', { classroomId })
    }

    // Listen for status updates
    const handleStatus = (data) => {
      if (data.classroomId === classroomId) {
        setIsEnabled(data.isEnabled)
        setViewerCount(data.viewerCount)
      }
    }

    const handleEnabled = (data) => {
      if (data.classroomId === classroomId) {
        setIsEnabled(true)
      }
    }

    const handleDisabled = (data) => {
      if (data.classroomId === classroomId) {
        setIsEnabled(false)
        setViewerCount(0)
      }
    }

    const handleViewerJoined = (data) => {
      setViewerCount(data.viewerCount)
    }

    const handleViewerLeft = (data) => {
      setViewerCount(data.viewerCount)
    }

    socketService.on('cctv:status', handleStatus)
    socketService.on('cctv:enabled', handleEnabled)
    socketService.on('cctv:disabled', handleDisabled)
    socketService.on('cctv:viewer-joined', handleViewerJoined)
    socketService.on('cctv:viewer-left', handleViewerLeft)

    return () => {
      socketService.off('cctv:status', handleStatus)
      socketService.off('cctv:enabled', handleEnabled)
      socketService.off('cctv:disabled', handleDisabled)
      socketService.off('cctv:viewer-joined', handleViewerJoined)
      socketService.off('cctv:viewer-left', handleViewerLeft)
    }
  }, [classroomId])

  const handleToggle = () => {
    if (isEnabled) {
      socketService.emit('cctv:disable', { classroomId })
    } else {
      socketService.emit('cctv:enable', { classroomId })
    }
  }

  if (!classroomId) {
    return null
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isEnabled ? 'bg-red-500 animate-pulse' : 'bg-gray-500'
            }`}
          />
          <span className="font-medium text-white">CCTV 참관</span>
        </div>

        <button
          onClick={handleToggle}
          disabled={!isConnected}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isEnabled
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isEnabled ? 'CCTV 종료' : 'CCTV 시작'}
        </button>
      </div>

      {isEnabled && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span>
            {viewerCount > 0
              ? `${viewerCount}명의 학부모가 시청 중`
              : '시청 중인 학부모 없음'}
          </span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        CCTV를 활성화하면 연결된 학부모가 강의실 영상을 볼 수 있습니다.
      </p>
    </div>
  )
}
