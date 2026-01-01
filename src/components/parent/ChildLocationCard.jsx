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

  const getLocationDisplay = (loc) => {
    if (!loc) return { name: '오프라인', icon: '🔴', color: 'text-gray-400' }

    // 서버에서 직접 전달받은 locationName 사용
    if (loc.locationName) {
      const name = loc.locationName
      // 위치에 따른 아이콘과 색상
      if (name.includes('운동장')) {
        return { name, icon: '🏃', color: 'text-green-400' }
      }
      if (name.includes('복도')) {
        return { name, icon: '🚶', color: 'text-yellow-400' }
      }
      if (name.includes('강의실')) {
        return { name, icon: '📚', color: 'text-blue-400' }
      }
      return { name, icon: '📍', color: 'text-purple-400' }
    }

    // 레거시 fallback: classroomId 파싱
    if (loc.classroomId) {
      if (loc.classroomId.includes('lobby')) return { name: '로비', icon: '🏢', color: 'text-yellow-400' }
      if (loc.classroomId.includes('classroom')) {
        const num = loc.classroomId.match(/\d+/)
        return { name: num ? `강의실 ${num[0]}` : '강의실', icon: '📚', color: 'text-blue-400' }
      }
      return { name: loc.classroomId, icon: '📍', color: 'text-purple-400' }
    }

    return { name: '접속 중', icon: '🟢', color: 'text-green-400' }
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
            {(() => {
              const locDisplay = getLocationDisplay(location)
              return (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{locDisplay.icon}</span>
                    <span className={`font-medium ${locDisplay.color}`}>
                      {locDisplay.name}
                    </span>
                  </div>

                  {/* 맵 타입 표시 */}
                  {location?.mapType && (
                    <div className="text-xs text-gray-500 mb-1">
                      {location.mapType === 'main' ? '야외' : '학교 건물 내부'}
                    </div>
                  )}
                </>
              )
            })()}

            {location?.position && (
              <div className="text-xs text-gray-400">
                좌표: X={location.position[0]?.toFixed(1)}, Y={location.position[1]?.toFixed(1)}, Z=
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
