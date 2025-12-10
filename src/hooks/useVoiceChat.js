import { useState, useEffect, useRef, useCallback } from 'react'
import { socketService } from '../services/socket'

/**
 * 음성 채팅 훅 (Mesh P2P 방식)
 * @param {string} roomId - 현재 방 ID
 * @param {Array} otherUsers - 다른 사용자 목록 [{ socketId, user }, ...]
 * @param {boolean} enabled - 훅 활성화 여부
 */
export function useVoiceChat(roomId, otherUsers = [], enabled = true) {
  const [isMicOn, setIsMicOn] = useState(false)
  const [error, setError] = useState(null)
  const [connections, setConnections] = useState(new Map()) // socketId -> connection info

  const localStreamRef = useRef(null)
  const peerConnectionsRef = useRef(new Map()) // socketId -> RTCPeerConnection
  const remoteStreamsRef = useRef(new Map()) // socketId -> MediaStream
  const audioElementsRef = useRef(new Map()) // socketId -> HTMLAudioElement

  // RTCPeerConnection 생성
  const createPeerConnection = useCallback((targetSocketId) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    }

    const peerConnection = new RTCPeerConnection(configuration)

    // 로컬 오디오 트랙 추가
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current)
      })
    }

    // 원격 스트림 수신
    peerConnection.ontrack = (event) => {
      console.log(`🎤 Received audio track from ${targetSocketId}`)
      const [remoteStream] = event.streams
      remoteStreamsRef.current.set(targetSocketId, remoteStream)

      // Audio 엘리먼트 생성 및 재생
      let audioElement = audioElementsRef.current.get(targetSocketId)
      if (!audioElement) {
        audioElement = new Audio()
        audioElement.autoplay = true
        audioElementsRef.current.set(targetSocketId, audioElement)
      }
      audioElement.srcObject = remoteStream

      setConnections(new Map(peerConnectionsRef.current))
    }

    // ICE candidate 수집
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('voice:ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        })
      }
    }

    // 연결 상태 모니터링
    peerConnection.onconnectionstatechange = () => {
      console.log(`🎤 Voice connection state with ${targetSocketId}: ${peerConnection.connectionState}`)
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed') {
        cleanupConnection(targetSocketId)
      }
    }

    return peerConnection
  }, [])

  // 특정 연결 정리
  const cleanupConnection = useCallback((targetSocketId) => {
    const pc = peerConnectionsRef.current.get(targetSocketId)
    if (pc) {
      pc.close()
      peerConnectionsRef.current.delete(targetSocketId)
    }

    const audioElement = audioElementsRef.current.get(targetSocketId)
    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      audioElementsRef.current.delete(targetSocketId)
    }

    remoteStreamsRef.current.delete(targetSocketId)
    setConnections(new Map(peerConnectionsRef.current))
  }, [])

  // Offer 생성 및 전송
  const sendOffer = useCallback(async (targetSocketId) => {
    try {
      const peerConnection = createPeerConnection(targetSocketId)
      peerConnectionsRef.current.set(targetSocketId, peerConnection)

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      socketService.emit('voice:offer', {
        targetSocketId,
        offer,
      })

      console.log(`🎤 Voice offer sent to ${targetSocketId}`)
    } catch (error) {
      console.error(`🎤 Error sending offer to ${targetSocketId}:`, error)
      cleanupConnection(targetSocketId)
    }
  }, [createPeerConnection, cleanupConnection])

  // 마이크 켜기
  const turnOnMic = useCallback(async () => {
    if (!enabled) return

    try {
      console.log('🎤 Turning on microphone...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      localStreamRef.current = stream
      setIsMicOn(true)
      setError(null)
      console.log('🎤 Microphone on')

      // 방에 있는 모든 사용자에게 offer 전송
      otherUsers.forEach((otherUser) => {
        sendOffer(otherUser.socketId)
      })
    } catch (error) {
      console.error('🎤 Error accessing microphone:', error)
      setError('마이크 접근 권한이 필요합니다.')
      setIsMicOn(false)
    }
  }, [enabled, otherUsers, sendOffer])

  // 마이크 끄기
  const turnOffMic = useCallback(() => {
    console.log('🎤 Turning off microphone...')

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // 모든 연결 정리
    peerConnectionsRef.current.forEach((pc, socketId) => {
      cleanupConnection(socketId)
    })
    peerConnectionsRef.current.clear()
    audioElementsRef.current.clear()
    remoteStreamsRef.current.clear()

    setIsMicOn(false)
    setConnections(new Map())
    console.log('🎤 Microphone off')
  }, [cleanupConnection])

  // Offer 수신 처리
  const handleOffer = useCallback(async ({ fromSocketId, offer }) => {
    try {
      console.log(`🎤 Received voice offer from ${fromSocketId}`)

      // 기존 연결이 있으면 정리
      if (peerConnectionsRef.current.has(fromSocketId)) {
        cleanupConnection(fromSocketId)
      }

      const peerConnection = createPeerConnection(fromSocketId)
      peerConnectionsRef.current.set(fromSocketId, peerConnection)

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      socketService.emit('voice:answer', {
        targetSocketId: fromSocketId,
        answer,
      })

      console.log(`🎤 Voice answer sent to ${fromSocketId}`)
    } catch (error) {
      console.error(`🎤 Error handling offer from ${fromSocketId}:`, error)
      cleanupConnection(fromSocketId)
    }
  }, [createPeerConnection, cleanupConnection])

  // Answer 수신 처리
  const handleAnswer = useCallback(async ({ fromSocketId, answer }) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(fromSocketId)
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        console.log(`🎤 Voice answer received from ${fromSocketId}`)
      }
    } catch (error) {
      console.error(`🎤 Error handling answer from ${fromSocketId}:`, error)
    }
  }, [])

  // ICE candidate 수신 처리
  const handleIceCandidate = useCallback(async ({ fromSocketId, candidate }) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(fromSocketId)
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      }
    } catch (error) {
      console.error(`🎤 Error adding ICE candidate from ${fromSocketId}:`, error)
    }
  }, [])

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!enabled) return

    socketService.on('voice:offer', handleOffer)
    socketService.on('voice:answer', handleAnswer)
    socketService.on('voice:ice-candidate', handleIceCandidate)

    console.log('🎤 Voice chat listeners registered')

    return () => {
      socketService.off('voice:offer', handleOffer)
      socketService.off('voice:answer', handleAnswer)
      socketService.off('voice:ice-candidate', handleIceCandidate)
      console.log('🎤 Voice chat listeners removed')
    }
  }, [enabled, handleOffer, handleAnswer, handleIceCandidate])

  // 새 사용자가 들어왔을 때 연결 생성
  useEffect(() => {
    if (!enabled || !isMicOn) return

    // 현재 연결되지 않은 사용자에게만 offer 전송
    otherUsers.forEach((otherUser) => {
      if (!peerConnectionsRef.current.has(otherUser.socketId)) {
        console.log(`🎤 New user detected: ${otherUser.user?.name}, sending offer`)
        sendOffer(otherUser.socketId)
      }
    })

    // 방을 떠난 사용자의 연결 정리
    const currentSocketIds = new Set(otherUsers.map((u) => u.socketId))
    peerConnectionsRef.current.forEach((_, socketId) => {
      if (!currentSocketIds.has(socketId)) {
        console.log(`🎤 User left: ${socketId}, cleaning up connection`)
        cleanupConnection(socketId)
      }
    })
  }, [enabled, isMicOn, otherUsers, sendOffer, cleanupConnection])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      peerConnectionsRef.current.forEach((pc) => pc.close())
      audioElementsRef.current.forEach((audio) => {
        audio.pause()
        audio.srcObject = null
      })
    }
  }, [])

  return {
    isMicOn,
    error,
    connections,
    turnOnMic,
    turnOffMic,
  }
}
