import { useState, useEffect, useRef } from 'react'
import { socketService } from '@/services/socket'
import { toast } from 'react-hot-toast'

/**
 * Student Screen Viewer Component for Parents
 *
 * Allows parents to view their child's screen when the student
 * has opted-in and is actively sharing their screen.
 *
 * FR-7.4: 부모는 자녀의 화면 공유 상태를 실시간으로 확인 가능
 * FR-7.5: 부모는 CCTV와 학생 화면을 탭으로 전환하며 볼 수 있음
 * FR-7.6: 학생 화면 시청 시에도 음성은 제공되지 않음
 */
export default function StudentScreenViewer({ studentId, studentName }) {
  const [isStudentSharing, setIsStudentSharing] = useState(false)
  const [studentSocketId, setStudentSocketId] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [stream, setStream] = useState(null)

  const videoRef = useRef(null)
  const peerConnectionRef = useRef(null)

  useEffect(() => {
    console.log('🖥️ [StudentScreenViewer] Effect triggered, studentId:', studentId)

    // Listen for student screen share events
    const handleScreenStarted = (data) => {
      console.log('🖥️ [StudentScreenViewer] Screen started event received:', data)
      console.log('🖥️ [StudentScreenViewer] Comparing studentId:', data.studentId, '===', studentId, '?', data.studentId === studentId)
      if (data.studentId === studentId) {
        console.log('🖥️ [StudentScreenViewer] Setting isStudentSharing=true, socketId:', data.socketId)
        setIsStudentSharing(true)
        setStudentSocketId(data.socketId)
        toast.success(`${data.studentName}님이 화면을 공유하기 시작했습니다.`)
      }
    }

    const handleScreenStopped = (data) => {
      console.log('🖥️ [StudentScreenViewer] Screen stopped:', data)
      if (data.studentId === studentId) {
        setIsStudentSharing(false)
        setStudentSocketId(null)
        cleanup()
        toast.info('학생이 화면 공유를 종료했습니다.')
      }
    }

    const handleOffer = async (data) => {
      console.log('🖥️ [StudentScreenViewer] Received offer:', data)
      if (!peerConnectionRef.current) {
        await createPeerConnection()
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        )

        const answer = await peerConnectionRef.current.createAnswer()
        await peerConnectionRef.current.setLocalDescription(answer)

        socketService.emit('student:screen-answer', {
          targetSocketId: data.fromSocketId,
          answer,
        })
      } catch (error) {
        console.error('Error handling offer:', error)
      }
    }

    const handleIce = async (data) => {
      console.log('🖥️ [StudentScreenViewer] Received ICE:', data)
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          )
        } catch (error) {
          console.error('Error adding ICE candidate:', error)
        }
      }
    }

    socketService.on('student:screen-started', handleScreenStarted)
    socketService.on('student:screen-stopped', handleScreenStopped)
    socketService.on('student:screen-offer', handleOffer)
    socketService.on('student:screen-ice', handleIce)

    return () => {
      socketService.off('student:screen-started', handleScreenStarted)
      socketService.off('student:screen-stopped', handleScreenStopped)
      socketService.off('student:screen-offer', handleOffer)
      socketService.off('student:screen-ice', handleIce)
      cleanup()
    }
  }, [studentId])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const createPeerConnection = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })

    pc.ontrack = (event) => {
      console.log('🖥️ [StudentScreenViewer] Got track:', event.streams[0])
      setStream(event.streams[0])
      setIsConnected(true)
      setIsConnecting(false)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && studentSocketId) {
        socketService.emit('student:screen-ice', {
          targetSocketId: studentSocketId,
          candidate: event.candidate,
        })
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('🖥️ [StudentScreenViewer] Connection state:', pc.connectionState)
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup()
      }
    }

    peerConnectionRef.current = pc
    return pc
  }

  const requestConnection = async () => {
    if (!studentSocketId) {
      toast.error('학생이 화면을 공유하고 있지 않습니다.')
      return
    }

    setIsConnecting(true)

    try {
      await createPeerConnection()

      // Request the student to send an offer
      socketService.emit('student:screen-request', {
        targetSocketId: studentSocketId,
      })

      toast.info('화면 연결을 요청했습니다...')
    } catch (error) {
      console.error('Error requesting connection:', error)
      toast.error('연결 요청에 실패했습니다.')
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    cleanup()
    toast.info('화면 시청을 종료했습니다.')
  }

  const cleanup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    setStream(null)
    setIsConnected(false)
    setIsConnecting(false)
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium">{studentName}님의 화면</h3>
              <p className="text-sm text-gray-400">
                {isStudentSharing ? '화면 공유 중' : '화면 공유 대기'}
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-green-500 animate-pulse'
                  : isStudentSharing
                    ? 'bg-yellow-500'
                    : 'bg-gray-500'
              }`}
            />
            <span className="text-sm text-gray-400">
              {isConnected ? '시청 중' : isStudentSharing ? '공유 중' : '대기'}
            </span>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative aspect-video bg-gray-900">
        {isConnected && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            {isStudentSharing ? (
              <>
                <svg className="w-16 h-16 mb-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-lg font-medium text-white mb-2">
                  {studentName}님이 화면을 공유하고 있습니다
                </p>
                <p className="text-sm mb-4">아래 버튼을 눌러 시청을 시작하세요</p>
              </>
            ) : (
              <>
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
                <p className="text-lg font-medium mb-2">화면 공유 대기 중</p>
                <p className="text-sm">학생이 화면 공유를 시작하면 여기에 표시됩니다</p>
              </>
            )}
          </div>
        )}

        {/* Connecting Overlay */}
        {isConnecting && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white">연결 중...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-800/50">
        {isConnected ? (
          <button
            onClick={disconnect}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
              />
            </svg>
            시청 종료
          </button>
        ) : (
          <button
            onClick={requestConnection}
            disabled={!isStudentSharing || isConnecting}
            className={`w-full px-4 py-2 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              isStudentSharing && !isConnecting
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {isConnecting ? '연결 중...' : '화면 시청 시작'}
          </button>
        )}

        {/* Privacy Notice */}
        <p className="text-xs text-gray-500 text-center mt-3">
          학생이 직접 화면 공유를 시작해야 시청할 수 있습니다. (FR-7.6: 음성 없음)
        </p>
      </div>
    </div>
  )
}
