import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * 학생용 화면 캡처 훅
 * 버튼 클릭으로 화면을 캡처하여 책상 위에 표시
 */
export function useStudentScreen(enabled = true) {
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const streamRef = useRef(null)

  // 화면 캡처 시작
  const startCapture = useCallback(async () => {
    if (!enabled) return

    try {
      setError(null)

      // 화면 캡처
      const capturedStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      })

      streamRef.current = capturedStream
      setStream(capturedStream)
      setIsSharing(true)

      // 사용자가 브라우저 UI로 공유 중지 시
      capturedStream.getVideoTracks()[0].onended = () => {
        console.log('🖥️ Student screen capture stopped by user')
        stopCapture()
      }

      console.log('🖥️ Student screen capture started')
    } catch (err) {
      console.error('🖥️ Error capturing student screen:', err)
      setError(err.message || '화면 캡처를 시작할 수 없습니다')
    }
  }, [enabled])

  // 화면 캡처 중지
  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStream(null)
    setIsSharing(false)
    setError(null)
    console.log('🖥️ Student screen capture stopped')
  }, [])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return {
    stream,
    error,
    isSharing,
    startCapture,
    stopCapture,
  }
}
