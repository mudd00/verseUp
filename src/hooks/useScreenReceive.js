import { useState, useEffect, useRef, useCallback } from 'react'
import { socketService } from '../services/socket'
import { getRTCConfiguration } from '../utils/webrtc'

/**
 * 학생용 화면 수신 훅 (WebRTC)
 * @param {string} roomId - 현재 방 ID
 * @param {boolean} enabled - 훅 활성화 여부 (학생일 때만 true)
 */
export function useScreenReceive(roomId, enabled = true) {
  const [teacherStream, setTeacherStream] = useState(null)
  const [isReceiving, setIsReceiving] = useState(false)
  const [teacherInfo, setTeacherInfo] = useState(null) // { teacherId, teacherName }
  const peerConnectionRef = useRef(null)

  // RTCPeerConnection 생성
  const createPeerConnection = useCallback(() => {
    const configuration = getRTCConfiguration()

    const peerConnection = new RTCPeerConnection(configuration)

    // 스트림 수신
    peerConnection.ontrack = (event) => {
      console.log('📺 Received track from teacher:', event.streams[0])
      setTeacherStream(event.streams[0])
      setIsReceiving(true)
    }

    // ICE candidate 수집
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && teacherInfo) {
        socketService.emit('screenshare:ice-candidate', {
          targetSocketId: teacherInfo.teacherSocketId,
          candidate: event.candidate,
        })
      }
    }

    // 연결 상태 모니터링
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `📺 Connection state with teacher: ${peerConnection.connectionState}`
      )
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed') {
        cleanup()
      }
    }

    return peerConnection
  }, [teacherInfo])

  // 정리 함수
  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    setTeacherStream(null)
    setIsReceiving(false)
  }, [])

  // 화면 공유 시작 알림 핸들러 (useCallback으로 안정적인 참조 유지)
  const handleScreenShareStarted = useCallback((data) => {
    console.log(`📺 🎉 [useScreenReceive] RECEIVED screenshare:started`, data)
    const { teacherId, teacherSocketId, teacherName } = data
    setTeacherInfo({ teacherId, teacherSocketId, teacherName })
    console.log('📺 [useScreenReceive] teacherInfo set to:', { teacherId, teacherSocketId, teacherName })
  }, [])

  // 화면 공유 시작 알림 수신
  useEffect(() => {
    if (!enabled) {
      console.log('⚠️ [useScreenReceive] disabled, not listening for screenshare:started')
      return
    }

    console.log('👂 [useScreenReceive] Effect running - Listening for screenshare:started events...')
    console.log('👂 [useScreenReceive] enabled:', enabled, 'roomId:', roomId)

    socketService.on('screenshare:started', handleScreenShareStarted)
    console.log('✅ [useScreenReceive] Handler registered for screenshare:started')

    return () => {
      console.log('🧹 [useScreenReceive] Cleanup: Removing handler for screenshare:started')
      socketService.off('screenshare:started', handleScreenShareStarted)
      console.log('✅ [useScreenReceive] Handler removed')
    }
  }, [enabled, handleScreenShareStarted])

  // 화면 공유 중지 알림 수신
  useEffect(() => {
    if (!enabled) return

    const handleScreenShareStopped = () => {
      console.log('📺 Teacher stopped screen sharing')
      cleanup()
      setTeacherInfo(null)
    }

    socketService.on('screenshare:stopped', handleScreenShareStopped)
    return () => socketService.off('screenshare:stopped', handleScreenShareStopped)
  }, [enabled, cleanup])

  // Offer 수신 처리
  useEffect(() => {
    if (!enabled) return

    const handleOffer = async ({ fromSocketId, offer }) => {
      try {
        console.log(`📺 Received offer from teacher ${fromSocketId}`)

        // 기존 연결 정리
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close()
        }

        // 새 peer connection 생성
        const peerConnection = createPeerConnection()
        peerConnectionRef.current = peerConnection

        // Offer 설정
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

        // Answer 생성 및 전송
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)

        socketService.emit('screenshare:answer', {
          targetSocketId: fromSocketId,
          answer,
        })

        console.log(`📺 Answer sent to teacher ${fromSocketId}`)
      } catch (error) {
        console.error('📺 Error handling offer:', error)
        cleanup()
      }
    }

    socketService.on('screenshare:offer', handleOffer)
    return () => socketService.off('screenshare:offer', handleOffer)
  }, [enabled, createPeerConnection, cleanup])

  // ICE candidate 수신 처리
  useEffect(() => {
    if (!enabled) return

    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          )
        }
      } catch (error) {
        console.error('📺 Error adding ICE candidate:', error)
      }
    }

    socketService.on('screenshare:ice-candidate', handleIceCandidate)
    return () => socketService.off('screenshare:ice-candidate', handleIceCandidate)
  }, [enabled])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    if (!enabled) return

    return () => {
      // cleanup 시 연결만 정리 (cleanup 함수 호출 안 함)
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
    }
  }, [enabled])

  return {
    teacherStream,
    isReceiving,
    teacherInfo,
  }
}
