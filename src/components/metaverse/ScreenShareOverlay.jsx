import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * 화면 공유 비디오 오버레이 컴포넌트
 * @param {MediaStream} stream - WebRTC로 수신한 비디오 스트림
 * @param {string} teacherName - 강사 이름
 * @param {Function} onClose - 닫기 버튼 클릭 핸들러
 */
export default function ScreenShareOverlay({ stream, teacherName, onClose }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 드래그 관련 상태
  const [position, setPosition] = useState({ x: null, y: null }) // null이면 기본 위치 사용
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // 크기 조절 관련 상태
  const [size, setSize] = useState({ width: 600, height: 400 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState(null)

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

  // 드래그 시작
  const handleDragStart = useCallback((e) => {
    if (isMinimized || isFullscreen) return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
    }
  }, [isMinimized, isFullscreen])

  // 드래그 중
  const handleDragMove = useCallback((e) => {
    if (!isDragging) return
    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    // 화면 밖으로 나가지 않도록 제한
    const maxX = window.innerWidth - size.width
    const maxY = window.innerHeight - size.height
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    })
  }, [isDragging, dragOffset, size])

  // 드래그 종료
  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 크기 조절 시작
  const handleResizeStart = useCallback((e, direction) => {
    if (isMinimized || isFullscreen) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeDirection(direction)
  }, [isMinimized, isFullscreen])

  // 크기 조절 중
  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !resizeDirection) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    let newWidth = size.width
    let newHeight = size.height
    let newX = position.x ?? (window.innerWidth - size.width - 16) // 기본 right-4 위치
    let newY = position.y ?? 80 // 기본 top-20 위치

    const minWidth = 300
    const minHeight = 200
    const maxWidth = window.innerWidth - 32
    const maxHeight = window.innerHeight - 32

    if (resizeDirection.includes('e')) {
      newWidth = Math.max(minWidth, Math.min(e.clientX - rect.left, maxWidth))
    }
    if (resizeDirection.includes('w')) {
      const deltaX = rect.left - e.clientX
      newWidth = Math.max(minWidth, Math.min(size.width + deltaX, maxWidth))
      if (newWidth !== size.width) {
        newX = Math.max(0, e.clientX)
      }
    }
    if (resizeDirection.includes('s')) {
      newHeight = Math.max(minHeight, Math.min(e.clientY - rect.top, maxHeight))
    }
    if (resizeDirection.includes('n')) {
      const deltaY = rect.top - e.clientY
      newHeight = Math.max(minHeight, Math.min(size.height + deltaY, maxHeight))
      if (newHeight !== size.height) {
        newY = Math.max(0, e.clientY)
      }
    }

    setSize({ width: newWidth, height: newHeight })
    if (resizeDirection.includes('w') || resizeDirection.includes('n')) {
      setPosition({ x: newX, y: newY })
    }
  }, [isResizing, resizeDirection, size, position])

  // 크기 조절 종료
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setResizeDirection(null)
  }, [])

  // 마우스 이벤트 리스너 등록
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleResizeEnd)
      return () => {
        window.removeEventListener('mousemove', handleResizeMove)
        window.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // 위치 및 크기 스타일 계산
  const getContainerStyle = () => {
    if (isMinimized) {
      return {
        bottom: '16px',
        right: '16px',
        width: '256px',
        height: '160px',
      }
    }
    return {
      left: position.x !== null ? `${position.x}px` : undefined,
      top: position.y !== null ? `${position.y}px` : '80px',
      right: position.x === null ? '16px' : undefined,
      width: `${size.width}px`,
      height: `${size.height}px`,
    }
  }

  if (!stream) return null

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 bg-black/90 backdrop-blur-sm rounded-lg shadow-2xl ${
        isDragging || isResizing ? '' : 'transition-all duration-300'
      }`}
      style={getContainerStyle()}
    >
      {/* 헤더 - 드래그 가능 */}
      <div
        className={`absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 flex items-center justify-between rounded-t-lg z-10 ${
          !isMinimized && !isFullscreen ? 'cursor-move' : ''
        }`}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold select-none">{teacherName}님의 화면</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* 최소화/복원 버튼 */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            onMouseDown={(e) => e.stopPropagation()}
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
              onMouseDown={(e) => e.stopPropagation()}
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
            onMouseDown={(e) => e.stopPropagation()}
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

      {/* 크기 조절 핸들 - 최소화/전체화면이 아닐 때만 표시 */}
      {!isMinimized && !isFullscreen && (
        <>
          {/* 모서리 핸들 */}
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-20"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-20"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-20"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-20"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />

          {/* 가장자리 핸들 */}
          <div
            className="absolute top-0 left-4 right-4 h-2 cursor-n-resize z-20"
            onMouseDown={(e) => handleResizeStart(e, 'n')}
          />
          <div
            className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize z-20"
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          <div
            className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize z-20"
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />
          <div
            className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize z-20"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}
    </div>
  )
}
