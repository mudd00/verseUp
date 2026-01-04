import { useState, useRef, useCallback, useEffect } from 'react'
import { socketService } from '@/services/socket'
import { getRTCConfiguration } from '@/utils/webrtc'

/**
 * 학생용 화면 캡처 및 공유 훅
 * - 버튼 클릭으로 화면을 캡처하여 책상 위에 표시
 * - WebRTC를 통해 부모에게 화면 스트리밍
 */
export function useStudentScreen(enabled = true, roomId = 'metaverse-classroom-1') {
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const streamRef = useRef(null)
  const peerConnectionsRef = useRef(new Map()) // socketId -> RTCPeerConnection

  // 화면 캡처 시작 및 소켓 알림
  const startCapture = useCallback(async () => {
    if (!enabled) return

    try {
      setError(null)

      // 화면 캡처 (시스템 오디오 포함)
      const capturedStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true, // 시스템 오디오 캡처 활성화
      })

      streamRef.current = capturedStream
      setStream(capturedStream)
      setIsSharing(true)

      // 소켓으로 화면 공유 동의 및 시작 알림
      socketService.emit('student:screen-consent', { consent: true })
      socketService.emit('student:screen-start', { roomId })
      console.log('🖥️ [StudentScreen] Started sharing and notified server')

      // 사용자가 브라우저 UI로 공유 중지 시
      capturedStream.getVideoTracks()[0].onended = () => {
        console.log('🖥️ [StudentScreen] Screen capture stopped by user')
        stopCapture()
      }

      console.log('🖥️ [StudentScreen] Screen capture started')
    } catch (err) {
      console.error('🖥️ [StudentScreen] Error capturing screen:', err)
      setError(err.message || '화면 캡처를 시작할 수 없습니다')
    }
  }, [enabled, roomId])

  // 화면 캡처 중지
  const stopCapture = useCallback(() => {
    // 모든 피어 연결 종료
    peerConnectionsRef.current.forEach((pc, socketId) => {
      pc.close()
      console.log(`🖥️ [StudentScreen] Closed peer connection with ${socketId}`)
    })
    peerConnectionsRef.current.clear()

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setStream(null)
    setIsSharing(false)
    setError(null)

    // 소켓으로 화면 공유 중지 알림
    socketService.emit('student:screen-stop', { roomId })
    socketService.emit('student:screen-consent', { consent: false })
    console.log('🖥️ [StudentScreen] Screen capture stopped and notified server')
  }, [roomId])

  // 부모로부터 화면 요청 시 WebRTC 연결
  const handleScreenRequest = useCallback(async (data) => {
    const targetSocketId = data.targetSocketId
    console.log(`🖥️ [StudentScreen] Received screen request from parent: ${targetSocketId}`)

    if (!streamRef.current) {
      console.warn('🖥️ [StudentScreen] No stream available for request')
      return
    }

    try {
      // 기존 연결 정리
      if (peerConnectionsRef.current.has(targetSocketId)) {
        peerConnectionsRef.current.get(targetSocketId).close()
        peerConnectionsRef.current.delete(targetSocketId)
      }

      // 새 피어 연결 생성
      const pc = new RTCPeerConnection(getRTCConfiguration())

      peerConnectionsRef.current.set(targetSocketId, pc)

      // 스트림 트랙 추가
      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current)
        console.log(`🖥️ [StudentScreen] Added track to peer connection: ${track.kind}`)
      })

      // ICE 후보 처리
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('student:screen-ice', {
            targetSocketId,
            candidate: event.candidate,
          })
        }
      }

      // 연결 상태 모니터링
      pc.onconnectionstatechange = () => {
        console.log(`🖥️ [StudentScreen] Connection state with ${targetSocketId}: ${pc.connectionState}`)
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          peerConnectionsRef.current.delete(targetSocketId)
          pc.close()
        }
      }

      // Offer 생성 및 전송
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      socketService.emit('student:screen-offer', {
        targetSocketId,
        offer,
      })

      console.log(`🖥️ [StudentScreen] Sent offer to parent: ${targetSocketId}`)
    } catch (err) {
      console.error('🖥️ [StudentScreen] Error creating peer connection:', err)
    }
  }, [])

  // Answer 수신 처리
  const handleScreenAnswer = useCallback(async (data) => {
    const { fromSocketId, answer } = data
    console.log(`🖥️ [StudentScreen] Received answer from: ${fromSocketId}`)

    const pc = peerConnectionsRef.current.get(fromSocketId)
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        console.log(`🖥️ [StudentScreen] Set remote description for: ${fromSocketId}`)
      } catch (err) {
        console.error('🖥️ [StudentScreen] Error setting remote description:', err)
      }
    }
  }, [])

  // ICE 후보 수신 처리
  const handleScreenIce = useCallback(async (data) => {
    const { fromSocketId, candidate } = data

    const pc = peerConnectionsRef.current.get(fromSocketId)
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.error('🖥️ [StudentScreen] Error adding ICE candidate:', err)
      }
    }
  }, [])

  // 소켓 이벤트 리스너 등록
  useEffect(() => {
    if (!enabled) return

    socketService.on('student:screen-request', handleScreenRequest)
    socketService.on('student:screen-answer', handleScreenAnswer)
    socketService.on('student:screen-ice', handleScreenIce)

    console.log('🖥️ [StudentScreen] Socket listeners registered')

    return () => {
      socketService.off('student:screen-request', handleScreenRequest)
      socketService.off('student:screen-answer', handleScreenAnswer)
      socketService.off('student:screen-ice', handleScreenIce)
      console.log('🖥️ [StudentScreen] Socket listeners removed')
    }
  }, [enabled, handleScreenRequest, handleScreenAnswer, handleScreenIce])

  // 탭 가시성 변경 처리 (탭 비활성화 시에도 스트림 유지)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isSharing) {
        console.log('🖥️ [StudentScreen] Tab hidden but keeping stream active')
        // 스트림은 유지하되 로그만 남김
      } else if (!document.hidden && isSharing) {
        console.log('🖥️ [StudentScreen] Tab visible, stream still active')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isSharing])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 모든 피어 연결 종료
      peerConnectionsRef.current.forEach((pc) => pc.close())
      peerConnectionsRef.current.clear()

      // 스트림 정리
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
