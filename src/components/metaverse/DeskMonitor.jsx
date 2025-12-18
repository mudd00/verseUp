import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * 책상 위 3D 모니터 컴포넌트
 * 학생이 보고 있는 화면을 책상 위에 표시
 * @param {MediaStream} stream - 학생의 화면 캡처 스트림
 * @param {Array} position - 모니터 위치 [x, y, z]
 * @param {number} rotationY - Y축 회전 각도 (캐릭터가 보는 방향 조정)
 */
export default function DeskMonitor({ stream, position = [0, 1, 0], rotationY = -Math.PI / 2 }) {
  const videoRef = useRef(null)
  const meshRef = useRef(null)
  const textureRef = useRef(null)
  const [needsUpdate, setNeedsUpdate] = useState(false)

  // Video 요소 및 Texture 초기화
  useEffect(() => {
    if (!stream) return

    // Video 요소 생성
    const video = document.createElement('video')
    video.srcObject = stream
    video.autoplay = true
    video.muted = true
    video.playsInline = true

    // Video가 재생되기 시작하면 texture 생성
    video.onloadedmetadata = () => {
      video.play().catch((err) => {
        console.error('🖥️ Error playing video:', err)
      })

      // Video Texture 생성
      const texture = new THREE.VideoTexture(video)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.format = THREE.RGBAFormat

      textureRef.current = texture
      videoRef.current = video

      setNeedsUpdate(true)
      console.log('🖥️ DeskMonitor texture created')
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.srcObject = null
      }
      if (textureRef.current) {
        textureRef.current.dispose()
      }
    }
  }, [stream])

  // Texture 자동 업데이트
  useFrame(() => {
    if (textureRef.current) {
      textureRef.current.needsUpdate = true
    }
  })

  if (!stream || !needsUpdate) {
    return null
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 모니터 화면 (16:9 비율) */}
      <mesh ref={meshRef} rotation={[-Math.PI / 6, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[1.6, 0.9]} />
        <meshBasicMaterial map={textureRef.current} toneMapped={false} />
      </mesh>

      {/* 모니터 프레임 */}
      <mesh rotation={[-Math.PI / 6, 0, 0]} position={[0, 0, -0.01]}>
        <planeGeometry args={[1.7, 1.0]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* 모니터 스탠드 */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.2]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {/* 모니터 베이스 */}
      <mesh position={[0, -0.65, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  )
}
