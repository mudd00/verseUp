import { useState, useEffect } from 'react'
import { socketService } from '@/services/socket'

/**
 * Child Location Card for Parents
 *
 * Shows the current location of a child in the metaverse
 * with real-time updates.
 */
export default function ChildLocationCard({ studentId, studentName }) {
  const [location, setLocation] = useState(null)
  const [isWatching, setIsWatching] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    if (!studentId || !isWatching) return

    // Subscribe to student location updates
    socketService.emit('parent:watch-student', { studentId })

    const handleLocation = (data) => {
      if (data.studentId === studentId) {
        setLocation(data)
        setLastUpdate(new Date())
      }
    }

    socketService.on('student:location', handleLocation)

    return () => {
      socketService.off('student:location', handleLocation)
      socketService.emit('parent:unwatch-student', { studentId })
    }
  }, [studentId, isWatching])

  const formatTime = (date) => {
    if (!date) return '-'
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getLocationName = (classroomId) => {
    if (!classroomId) return '오프라인'

    // Parse classroom ID to get a friendly name
    if (classroomId.includes('lobby')) return '로비'
    if (classroomId.includes('classroom')) {
      const num = classroomId.match(/\d+/)
      return num ? `강의실 ${num[0]}` : '강의실'
    }
    return classroomId
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium">{studentName?.charAt(0) || '?'}</span>
          </div>
          <div>
            <p className="text-white font-medium">{studentName}</p>
            <p className="text-xs text-gray-400">
              {location ? '접속 중' : '오프라인'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsWatching(!isWatching)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            isWatching
              ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isWatching ? '추적 중지' : '위치 추적'}
        </button>
      </div>

      {isWatching && (
        <div className="space-y-3">
          {/* Location Info */}
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-white font-medium">
                {location ? getLocationName(location.classroomId) : '오프라인'}
              </span>
            </div>

            {location?.position && (
              <div className="text-xs text-gray-400">
                위치: X={location.position[0]?.toFixed(1)}, Y={location.position[1]?.toFixed(1)}, Z=
                {location.position[2]?.toFixed(1)}
              </div>
            )}
          </div>

          {/* Last Update */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>마지막 업데이트</span>
            <span>{formatTime(lastUpdate)}</span>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                location ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
              }`}
            />
            <span className="text-xs text-gray-400">
              {location ? '실시간 추적 중' : '접속 대기 중'}
            </span>
          </div>
        </div>
      )}

      {!isWatching && (
        <p className="text-xs text-gray-500">
          위치 추적을 시작하면 자녀의 메타버스 내 위치를 실시간으로 확인할 수 있습니다.
        </p>
      )}
    </div>
  )
}
