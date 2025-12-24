import { useState, useEffect, useRef } from 'react'
import { socketService } from '@/services/socket'
import { toast } from 'react-hot-toast'

/**
 * Screen Share Consent Component for Students
 *
 * Allows students to give consent and share their screen with instructors/parents.
 * This is an opt-in feature - students must explicitly choose to share.
 */
export default function ScreenShareConsent({ roomId }) {
  const [consentGiven, setConsentGiven] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [stream, setStream] = useState(null)
  const peerConnectionsRef = useRef(new Map())
  const streamRef = useRef(null)

  useEffect(() => {
    // Listen for screen share requests
    const handleOfferRequest = async (data) => {
      if (!isSharing || !streamRef.current) return
      await createOfferFor(data.targetSocketId)
    }

    const handleAnswer = async (data) => {
      const pc = peerConnectionsRef.current.get(data.fromSocketId)
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
      }
    }

    const handleIce = async (data) => {
      const pc = peerConnectionsRef.current.get(data.fromSocketId)
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      }
    }

    socketService.on('student:screen-request', handleOfferRequest)
    socketService.on('student:screen-answer', handleAnswer)
    socketService.on('student:screen-ice', handleIce)

    return () => {
      socketService.off('student:screen-request', handleOfferRequest)
      socketService.off('student:screen-answer', handleAnswer)
      socketService.off('student:screen-ice', handleIce)
      cleanup()
    }
  }, [isSharing])

  const handleConsentChange = (consent) => {
    setConsentGiven(consent)
    socketService.emit('student:screen-consent', { consent })

    if (!consent && isSharing) {
      stopSharing()
    }
  }

  const startSharing = async () => {
    if (!consentGiven) {
      toast.error('먼저 화면 공유에 동의해주세요.')
      return
    }

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        },
        audio: false,
      })

      // Handle stream ending (user clicked stop sharing in browser)
      mediaStream.getVideoTracks()[0].onended = () => {
        stopSharing()
      }

      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsSharing(true)

      socketService.emit('student:screen-start', { roomId })
      toast.success('화면 공유가 시작되었습니다.')
    } catch (error) {
      console.error('Screen share error:', error)
      if (error.name === 'NotAllowedError') {
        toast.error('화면 공유가 취소되었습니다.')
      } else {
        toast.error('화면 공유를 시작할 수 없습니다.')
      }
    }
  }

  const stopSharing = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    cleanup()
    setStream(null)
    setIsSharing(false)

    socketService.emit('student:screen-stop', { roomId })
    toast.success('화면 공유가 종료되었습니다.')
  }

  const createOfferFor = async (targetSocketId) => {
    if (!streamRef.current) return

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })

    streamRef.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, streamRef.current)
    })

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('student:screen-ice', {
          targetSocketId,
          candidate: event.candidate,
        })
      }
    }

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    socketService.emit('student:screen-offer', {
      targetSocketId,
      offer,
    })

    peerConnectionsRef.current.set(targetSocketId, peerConnection)
  }

  const cleanup = () => {
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-medium">화면 공유</h4>
        <div
          className={`w-2 h-2 rounded-full ${
            isSharing ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          }`}
        />
      </div>

      {/* Consent Toggle */}
      <div className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
        <div>
          <p className="text-sm text-white">화면 공유 동의</p>
          <p className="text-xs text-gray-400">강사/학부모에게 내 화면을 공유할 수 있습니다</p>
        </div>
        <button
          onClick={() => handleConsentChange(!consentGiven)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            consentGiven ? 'bg-green-600' : 'bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              consentGiven ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Share Button */}
      {consentGiven && (
        <div className="flex gap-2">
          {!isSharing ? (
            <button
              onClick={startSharing}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              화면 공유 시작
            </button>
          ) : (
            <button
              onClick={stopSharing}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              화면 공유 중지
            </button>
          )}
        </div>
      )}

      {/* Status */}
      {isSharing && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          화면을 공유하고 있습니다
        </div>
      )}

      {/* Privacy Notice */}
      <p className="text-xs text-gray-500">
        화면 공유는 언제든지 중지할 수 있습니다. 공유 중에는 선택한 화면만 전송됩니다.
      </p>
    </div>
  )
}
