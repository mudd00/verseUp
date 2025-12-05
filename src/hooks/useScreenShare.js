import { useState, useEffect, useRef, useCallback } from 'react'
import { socketService } from '../services/socket'

/**
 * 강사용 화면 공유 훅 (WebRTC)
 * @param {string} roomId - 현재 방 ID
 * @param {Array} students - 학생 목록 [{ socketId, user }, ...]
 * @param {boolean} enabled - 훅 활성화 여부 (강사일 때만 true)
 */
export function useScreenShare(roomId, students = [], enabled = true) {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState(null)
  const streamRef = useRef(null)
  const peerConnectionsRef = useRef(new Map()) // socketId -> RTCPeerConnection

  // RTCPeerConnection 설정
  const createPeerConnection = useCallback((studentSocketId) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    }

    const peerConnection = new RTCPeerConnection(configuration)

    // ICE candidate 수집
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('screenshare:ice-candidate', {
          targetSocketId: studentSocketId,
          candidate: event.candidate,
        })
      }
    }

    // 연결 상태 모니터링
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `📺 Connection state with ${studentSocketId}: ${peerConnection.connectionState}`
      )
      if (peerConnection.connectionState === 'failed') {
        console.error(`📺 Connection failed with ${studentSocketId}`)
      }
    }

    return peerConnection
  }, [])

  // 학생에게 offer 전송
  const sendOfferToStudent = useCallback(
    async (studentSocketId) => {
      try {
        const peerConnection = createPeerConnection(studentSocketId)
        peerConnectionsRef.current.set(studentSocketId, peerConnection)

        // 스트림의 모든 트랙을 peer connection에 추가
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => {
            peerConnection.addTrack(track, streamRef.current)
          })
        }

        // Offer 생성 및 전송
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)

        socketService.emit('screenshare:offer', {
          targetSocketId: studentSocketId,
          offer,
        })

        console.log(`📺 Offer sent to student ${studentSocketId}`)
      } catch (error) {
        console.error(`📺 Error sending offer to ${studentSocketId}:`, error)
      }
    },
    [createPeerConnection]
  )

  // Answer 수신 처리
  useEffect(() => {
    if (!enabled) return

    const handleAnswer = async ({ fromSocketId, answer }) => {
      try {
        const peerConnection = peerConnectionsRef.current.get(fromSocketId)
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
          console.log(`📺 Answer received from ${fromSocketId}`)
        }
      } catch (error) {
        console.error('📺 Error handling answer:', error)
      }
    }

    socketService.on('screenshare:answer', handleAnswer)
    return () => socketService.off('screenshare:answer', handleAnswer)
  }, [enabled])

  // ICE candidate 수신 처리
  useEffect(() => {
    if (!enabled) return

    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      try {
        const peerConnection = peerConnectionsRef.current.get(fromSocketId)
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        }
      } catch (error) {
        console.error('📺 Error adding ICE candidate:', error)
      }
    }

    socketService.on('screenshare:ice-candidate', handleIceCandidate)
    return () => socketService.off('screenshare:ice-candidate', handleIceCandidate)
  }, [enabled])

  // 화면 공유 시작
  const startSharing = useCallback(async () => {
    if (!enabled) {
      console.warn('⚠️ startSharing called but hook is disabled')
      return
    }

    console.log('🎬 Starting screen share...', { roomId, studentsCount: students.length })

    try {
      setError(null)

      // 화면 캡처
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      })

      console.log('✅ Screen captured successfully')
      streamRef.current = stream

      // 스트림 종료 감지 (사용자가 브라우저 UI로 공유 중지)
      stream.getVideoTracks()[0].onended = () => {
        console.log('📺 Screen sharing stopped by user')
        stopSharing()
      }

      // 서버에 화면 공유 시작 알림
      console.log('📤 Emitting screenshare:start to room:', roomId)
      socketService.emit('screenshare:start', { roomId })

      setIsSharing(true)
      console.log('📺 Screen sharing started', { roomId, students: students.length })

      // 현재 방의 모든 학생들에게 offer 전송
      students.forEach((student) => {
        if (student.socketId) {
          sendOfferToStudent(student.socketId)
        }
      })
    } catch (error) {
      console.error('📺 Error starting screen share:', error)
      setError(error.message || '화면 공유를 시작할 수 없습니다')
      setIsSharing(false)
    }
  }, [enabled, roomId, students, sendOfferToStudent])

  // 화면 공유 중지
  const stopSharing = useCallback(() => {
    if (!enabled) return // 비활성화 상태면 아무것도 안 함

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // 모든 peer connection 정리
    peerConnectionsRef.current.forEach((pc) => {
      pc.close()
    })
    peerConnectionsRef.current.clear()

    // 서버에 화면 공유 중지 알림
    if (isSharing) {
      socketService.emit('screenshare:stop', { roomId })
    }

    setIsSharing(false)
    setError(null)
    console.log('📺 Screen sharing stopped')
  }, [enabled, roomId, isSharing])

  // 새로운 학생이 입장했을 때 offer 전송
  useEffect(() => {
    if (!enabled) return

    if (isSharing && students.length > 0) {
      students.forEach((student) => {
        if (student.socketId && !peerConnectionsRef.current.has(student.socketId)) {
          sendOfferToStudent(student.socketId)
        }
      })
    }
  }, [enabled, isSharing, students, sendOfferToStudent])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    if (!enabled) return

    return () => {
      // cleanup 시 스트림과 연결만 정리 (stopSharing 호출 안 함)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      peerConnectionsRef.current.forEach((pc) => pc.close())
      peerConnectionsRef.current.clear()
    }
  }, [enabled])

  return {
    isSharing,
    error,
    startSharing,
    stopSharing,
  }
}
