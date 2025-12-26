import { useState, useEffect, useRef } from 'react'
import { socketService } from '@/services/socket'

/**
 * CCTV Viewer for Parents
 *
 * Allows parents to view the CCTV stream from their child's classroom.
 */
export default function CCTVViewer({ classroomId, studentId, studentName }) {
  const videoRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const [status, setStatus] = useState('unavailable') // unavailable | disconnected | connecting | connected
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('📹 [CCTVViewer] Effect triggered, classroomId:', classroomId)

    if (!classroomId) {
      console.log('📹 [CCTVViewer] No classroomId, setting unavailable')
      setStatus('unavailable')
      return
    }

    // Check if CCTV is available
    console.log('📹 [CCTVViewer] Requesting CCTV status for:', classroomId)
    socketService.emit('cctv:status', { classroomId })

    // Setup socket listeners
    const handleStatus = (data) => {
      console.log('📹 [CCTVViewer] Received cctv:status:', data)
      if (data.classroomId === classroomId) {
        if (data.isEnabled) {
          console.log('📹 [CCTVViewer] CCTV is enabled, setting disconnected (ready to connect)')
          setStatus('disconnected')
          setError(null)
        } else {
          console.log('📹 [CCTVViewer] CCTV is not enabled')
          setStatus('unavailable')
        }
      }
    }

    const handleAuthorized = (data) => {
      if (data.classroomId === classroomId) {
        setStatus('connecting')
        console.log('CCTV: Authorized to view')
      }
    }

    const handleUnavailable = (data) => {
      if (data.classroomId === classroomId) {
        setStatus('unavailable')
        setError(data.reason)
      }
    }

    const handleOffer = async (data) => {
      try {
        console.log('CCTV: Received offer')
        await handleIncomingOffer(data.fromSocketId, data.offer)
      } catch (err) {
        console.error('CCTV: Error handling offer', err)
        setError('연결 오류가 발생했습니다.')
      }
    }

    const handleAnswer = async (data) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        )
      }
    }

    const handleIceCandidate = async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
      }
    }

    const handleDisabled = (data) => {
      if (data.classroomId === classroomId) {
        setStatus('unavailable')
        cleanup()
      }
    }

    socketService.on('cctv:status', handleStatus)
    socketService.on('cctv:authorized', handleAuthorized)
    socketService.on('cctv:unavailable', handleUnavailable)
    socketService.on('cctv:offer', handleOffer)
    socketService.on('cctv:answer', handleAnswer)
    socketService.on('cctv:ice-candidate', handleIceCandidate)
    socketService.on('cctv:disabled', handleDisabled)

    return () => {
      socketService.off('cctv:status', handleStatus)
      socketService.off('cctv:authorized', handleAuthorized)
      socketService.off('cctv:unavailable', handleUnavailable)
      socketService.off('cctv:offer', handleOffer)
      socketService.off('cctv:answer', handleAnswer)
      socketService.off('cctv:ice-candidate', handleIceCandidate)
      socketService.off('cctv:disabled', handleDisabled)
      cleanup()
    }
  }, [classroomId])

  const handleIncomingOffer = async (fromSocketId, offer) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })

    peerConnectionRef.current = peerConnection

    // Handle incoming video stream
    peerConnection.ontrack = (event) => {
      console.log('CCTV: Received video stream')
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0]
        setStatus('connected')
      }
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('cctv:ice-candidate', {
          targetSocketId: fromSocketId,
          candidate: event.candidate,
        })
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('CCTV: Connection state:', peerConnection.connectionState)
      if (peerConnection.connectionState === 'failed') {
        setStatus('unavailable')
        setError('연결이 끊어졌습니다.')
      }
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    socketService.emit('cctv:answer', {
      targetSocketId: fromSocketId,
      answer,
    })
  }

  const startViewing = () => {
    console.log('📹 [CCTVViewer] startViewing called, classroomId:', classroomId, ', studentId:', studentId)
    setStatus('connecting')
    setError(null)
    socketService.emit('cctv:request', { classroomId, studentId })
  }

  const stopViewing = () => {
    socketService.emit('cctv:stop-viewing', { classroomId })
    cleanup()
    setStatus('disconnected')
  }

  const cleanup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-700/50">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'connected'
                ? 'bg-green-500'
                : status === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-gray-500'
            }`}
          />
          <span className="text-sm font-medium text-white">
            {studentName ? `${studentName}님의 강의실` : '강의실 CCTV'}
          </span>
        </div>

        {status === 'connected' && (
          <button
            onClick={stopViewing}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            시청 종료
          </button>
        )}
      </div>

      {/* Video Area */}
      <div className="relative aspect-video bg-black">
        {status === 'connected' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            {status === 'unavailable' ? (
              <>
                <svg
                  className="w-12 h-12 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3l18 18"
                  />
                </svg>
                <p className="text-sm mb-1">CCTV를 사용할 수 없습니다</p>
                <p className="text-xs text-gray-500">{error || '강사가 CCTV를 활성화하지 않았습니다'}</p>
              </>
            ) : status === 'connecting' ? (
              <>
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm">연결 중...</p>
              </>
            ) : (
              <>
                <svg
                  className="w-12 h-12 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm mb-3">강의실 CCTV 시청하기</p>
                <button
                  onClick={startViewing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  시청 시작
                </button>
              </>
            )}
          </div>
        )}

        {/* Live indicator */}
        {status === 'connected' && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-red-600 rounded text-xs font-medium">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 text-xs text-gray-500">
        <p>학부모 참관 시스템 - 강사가 활성화한 경우에만 시청할 수 있습니다.</p>
      </div>
    </div>
  )
}
