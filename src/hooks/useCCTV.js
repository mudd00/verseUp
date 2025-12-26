import { useState, useRef, useCallback, useEffect } from 'react'
import { socketService } from '@/services/socket'

/**
 * 강사용 CCTV 스트리밍 훅
 * - 강사가 CCTV를 활성화하면 화면/웹캠을 캡처
 * - 학부모 요청 시 WebRTC로 스트리밍
 */
export function useCCTV(classroomId, isInstructor = false) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [error, setError] = useState(null)
  const [stream, setStream] = useState(null)

  const streamRef = useRef(null)
  const peerConnectionsRef = useRef(new Map()) // socketId -> RTCPeerConnection
  const pendingViewersRef = useRef([]) // 스트림 준비 전에 요청한 시청자들

  // CCTV 활성화 (화면 캡처 + 서버 알림)
  const enableCCTV = useCallback(async () => {
    if (!isInstructor || !classroomId) return

    try {
      setError(null)

      // 화면 캡처 (강의실 전체 화면 공유)
      const capturedStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15 }, // CCTV는 15fps면 충분
        },
        audio: false,
      })

      streamRef.current = capturedStream
      setStream(capturedStream)

      // 화면 공유 종료 시 CCTV 비활성화
      capturedStream.getVideoTracks()[0].onended = () => {
        console.log('📹 [CCTV] Screen capture stopped by user')
        disableCCTV()
      }

      // 서버에 CCTV 활성화 알림
      socketService.emit('cctv:enable', { classroomId })
      setIsEnabled(true)
      console.log('📹 [CCTV] Enabled and capturing screen')

      // 대기 중인 시청자에게 연결
      pendingViewersRef.current.forEach(({ viewerId, viewerSocketId }) => {
        setupPeerConnection(viewerSocketId)
      })
      pendingViewersRef.current = []

    } catch (err) {
      console.error('📹 [CCTV] Error enabling:', err)
      setError(err.message || 'CCTV를 활성화할 수 없습니다')
    }
  }, [isInstructor, classroomId])

  // CCTV 비활성화
  const disableCCTV = useCallback(() => {
    // 모든 피어 연결 종료
    peerConnectionsRef.current.forEach((pc, socketId) => {
      pc.close()
      console.log(`📹 [CCTV] Closed peer connection with ${socketId}`)
    })
    peerConnectionsRef.current.clear()
    pendingViewersRef.current = []

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setStream(null)
    setIsEnabled(false)
    setViewerCount(0)
    setError(null)

    // 서버에 CCTV 비활성화 알림
    socketService.emit('cctv:disable', { classroomId })
    console.log('📹 [CCTV] Disabled')
  }, [classroomId])

  // WebRTC 피어 연결 설정 및 Offer 전송
  const setupPeerConnection = useCallback(async (viewerSocketId) => {
    if (!streamRef.current) {
      console.warn('📹 [CCTV] No stream available, queueing viewer')
      pendingViewersRef.current.push({ viewerSocketId })
      return
    }

    try {
      // 기존 연결 정리
      if (peerConnectionsRef.current.has(viewerSocketId)) {
        peerConnectionsRef.current.get(viewerSocketId).close()
        peerConnectionsRef.current.delete(viewerSocketId)
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      })

      peerConnectionsRef.current.set(viewerSocketId, pc)

      // 스트림 트랙 추가
      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current)
        console.log(`📹 [CCTV] Added track: ${track.kind}`)
      })

      // ICE 후보 처리
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.emit('cctv:ice-candidate', {
            targetSocketId: viewerSocketId,
            candidate: event.candidate,
          })
        }
      }

      // 연결 상태 모니터링
      pc.onconnectionstatechange = () => {
        console.log(`📹 [CCTV] Connection state with ${viewerSocketId}: ${pc.connectionState}`)
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          peerConnectionsRef.current.delete(viewerSocketId)
          pc.close()
        }
      }

      // Offer 생성 및 전송
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      socketService.emit('cctv:offer', {
        targetSocketId: viewerSocketId,
        offer,
        classroomId,
      })

      console.log(`📹 [CCTV] Sent offer to viewer: ${viewerSocketId}`)
    } catch (err) {
      console.error('📹 [CCTV] Error setting up peer connection:', err)
    }
  }, [classroomId])

  // 소켓 이벤트 핸들러
  useEffect(() => {
    if (!isInstructor || !classroomId) return

    // 새 시청자 입장
    const handleViewerJoined = (data) => {
      console.log(`📹 [CCTV] Viewer joined:`, data)
      setViewerCount(data.viewerCount || 0)

      // 시청자에게 WebRTC 연결 설정 (viewerSocketId가 필요함)
      // 서버에서 viewerSocketId를 보내도록 해야 함
      if (data.viewerSocketId && streamRef.current) {
        setupPeerConnection(data.viewerSocketId)
      }
    }

    // 시청자 퇴장
    const handleViewerLeft = (data) => {
      console.log(`📹 [CCTV] Viewer left:`, data)
      setViewerCount(data.viewerCount || 0)

      // 피어 연결 정리
      if (data.viewerSocketId && peerConnectionsRef.current.has(data.viewerSocketId)) {
        peerConnectionsRef.current.get(data.viewerSocketId).close()
        peerConnectionsRef.current.delete(data.viewerSocketId)
      }
    }

    // CCTV 활성화 성공
    const handleEnableSuccess = (data) => {
      if (data.classroomId === classroomId) {
        console.log('📹 [CCTV] Enable success confirmed')
      }
    }

    // Answer 수신
    const handleAnswer = async (data) => {
      console.log(`📹 [CCTV] Received answer from: ${data.fromSocketId}`)
      const pc = peerConnectionsRef.current.get(data.fromSocketId)
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
          console.log(`📹 [CCTV] Set remote description for: ${data.fromSocketId}`)
        } catch (err) {
          console.error('📹 [CCTV] Error setting remote description:', err)
        }
      }
    }

    // ICE 후보 수신
    const handleIce = async (data) => {
      const pc = peerConnectionsRef.current.get(data.fromSocketId)
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
        } catch (err) {
          console.error('📹 [CCTV] Error adding ICE candidate:', err)
        }
      }
    }

    socketService.on('cctv:viewer-joined', handleViewerJoined)
    socketService.on('cctv:viewer-left', handleViewerLeft)
    socketService.on('cctv:enable-success', handleEnableSuccess)
    socketService.on('cctv:answer', handleAnswer)
    socketService.on('cctv:ice-candidate', handleIce)

    console.log('📹 [CCTV] Socket listeners registered for instructor')

    return () => {
      socketService.off('cctv:viewer-joined', handleViewerJoined)
      socketService.off('cctv:viewer-left', handleViewerLeft)
      socketService.off('cctv:enable-success', handleEnableSuccess)
      socketService.off('cctv:answer', handleAnswer)
      socketService.off('cctv:ice-candidate', handleIce)
      console.log('📹 [CCTV] Socket listeners removed')
    }
  }, [isInstructor, classroomId, setupPeerConnection])

  // 탭 가시성 변경 처리
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isEnabled) {
        console.log('📹 [CCTV] Tab hidden but keeping CCTV active')
      } else if (!document.hidden && isEnabled) {
        console.log('📹 [CCTV] Tab visible, CCTV still active')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isEnabled])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      peerConnectionsRef.current.forEach((pc) => pc.close())
      peerConnectionsRef.current.clear()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return {
    isEnabled,
    viewerCount,
    error,
    stream,
    enableCCTV,
    disableCCTV,
    toggle: isEnabled ? disableCCTV : enableCCTV,
  }
}
