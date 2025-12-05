import { useEffect, useRef, useState } from 'react'

/**
 * 화면 공유 비디오 오버레이 컴포넌트
 * @param {MediaStream} stream - WebRTC로 수신한 비디오 스트림
 * @param {string} teacherName - 강사 이름
 * @param {Function} onClose - 닫기 버튼 클릭 핸들러
 */
export default function ScreenShareOverlay({ stream, teacherName, onClose }) {
  const videoRef = useRef(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 비디오 요소에 스트림 연결
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // 전체화면 토글
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // 전체화면 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (!stream) return null

  return (
    <div
      className={`fixed z-50 bg-black/90 backdrop-blur-sm rounded-lg shadow-2xl transition-all duration-300 ${
        isMinimized
          ? 'bottom-4 right-4 w-64 h-40'
          : 'top-20 right-4 w-[600px] h-[400px]'
      }`}
    >
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 flex items-center justify-between rounded-t-lg z-10">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold">{teacherName}님의 화면</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* 최소화/복원 버튼 */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-white/20 p-1 rounded transition"
            title={isMinimized ? '복원' : '최소화'}
          >
            {isMinimized ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            )}
          </button>

          {/* 전체화면 버튼 */}
          {!isMinimized && (
            <button
              onClick={toggleFullscreen}
              className="hover:bg-white/20 p-1 rounded transition"
              title={isFullscreen ? '전체화면 종료' : '전체화면'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          )}

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="hover:bg-red-600 p-1 rounded transition"
            title="닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* 비디오 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full rounded-lg object-contain"
        style={{ marginTop: isMinimized ? '0' : '40px', height: isMinimized ? '100%' : 'calc(100% - 40px)' }}
      />

      {/* 로딩 표시 */}
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-sm">화면을 불러오는 중...</p>
          </div>
        </div>
      )}
    </div>
  )
}
