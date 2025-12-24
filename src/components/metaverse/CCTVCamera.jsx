import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { socketService } from '@/services/socket'
import { useAuthStore } from '@/stores/authStore'

/**
 * CCTV Camera Component
 *
 * This component provides a fixed camera view for CCTV streaming.
 * When enabled by an instructor, it captures the scene and streams it to parent viewers.
 *
 * The camera is positioned at the back of the classroom looking forward.
 */
export default function CCTVCamera({ classroomId, isEnabled, onStreamReady }) {
  const cameraRef = useRef()
  const { gl, scene } = useThree()
  const { user } = useAuthStore()
  const [isStreaming, setIsStreaming] = useState(false)
  const streamRef = useRef(null)
  const peerConnectionsRef = useRef(new Map())

  // Fixed CCTV camera position (back of classroom, elevated)
  const CCTV_POSITION = [0, 5, -15] // x, y, z - back wall, elevated
  const CCTV_LOOK_AT = [0, 1.5, 5] // Looking towards front of classroom

  useEffect(() => {
    if (!isEnabled || !classroomId) {
      stopStreaming()
      return
    }

    // Only instructors can enable CCTV streaming
    if (user?.role !== 'instructor' && user?.role !== 'admin') {
      return
    }

    startStreaming()

    return () => {
      stopStreaming()
    }
  }, [isEnabled, classroomId])

  useEffect(() => {
    // Listen for viewer join events
    const handleViewerJoined = async (data) => {
      if (!isStreaming || !streamRef.current) return

      console.log('CCTV: New viewer joined, creating connection')
      // When a new viewer joins, we need to send them an offer
      // This is handled by the parent component or service
    }

    socketService.on('cctv:viewer-joined', handleViewerJoined)

    return () => {
      socketService.off('cctv:viewer-joined', handleViewerJoined)
    }
  }, [isStreaming])

  const startStreaming = async () => {
    try {
      // Capture the WebGL canvas stream
      const canvas = gl.domElement
      const stream = canvas.captureStream(30) // 30 FPS

      streamRef.current = stream
      setIsStreaming(true)

      console.log('CCTV: Started streaming from canvas')

      if (onStreamReady) {
        onStreamReady(stream)
      }

      // Notify server that CCTV is enabled
      socketService.emit('cctv:enable', { classroomId })
    } catch (error) {
      console.error('CCTV: Failed to start streaming', error)
    }
  }

  const stopStreaming = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()

    setIsStreaming(false)

    if (classroomId) {
      socketService.emit('cctv:disable', { classroomId })
    }

    console.log('CCTV: Stopped streaming')
  }

  // The CCTV camera is only used for rendering to the stream
  // The main view still uses the player's camera
  // This is a separate render target approach - simplified for now

  return null // CCTV uses the main canvas stream
}

/**
 * CCTV Camera Indicator
 *
 * Visual indicator in the 3D scene showing where the CCTV camera is positioned
 */
export function CCTVCameraIndicator({ position = [0, 5, -15], isActive = false }) {
  return (
    <group position={position}>
      {/* Camera body */}
      <mesh>
        <boxGeometry args={[0.3, 0.2, 0.4]} />
        <meshStandardMaterial color={isActive ? '#22c55e' : '#6b7280'} />
      </mesh>

      {/* Camera lens */}
      <mesh position={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.08, 0.1, 0.15, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* Recording indicator light */}
      {isActive && (
        <mesh position={[0.12, 0.08, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}

      {/* Mount bracket */}
      <mesh position={[0, 0.15, -0.1]}>
        <boxGeometry args={[0.1, 0.1, 0.2]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
    </group>
  )
}
