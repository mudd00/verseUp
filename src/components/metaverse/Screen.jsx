import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

export default function Screen({ position, size = [8, 4.5], videoStream }) {
  const meshRef = useRef(null)
  const [videoTexture, setVideoTexture] = useState(null)

  useEffect(() => {
    if (videoStream) {
      // 비디오 엘리먼트 생성
      const video = document.createElement('video')
      video.srcObject = videoStream
      video.autoplay = true
      video.muted = true
      video.playsInline = true

      video.onloadedmetadata = () => {
        video.play()
        // VideoTexture 생성
        const texture = new THREE.VideoTexture(video)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.format = THREE.RGBAFormat
        setVideoTexture(texture)
      }

      return () => {
        video.pause()
        video.srcObject = null
      }
    } else {
      setVideoTexture(null)
    }
  }, [videoStream])

  return (
    <mesh ref={meshRef} position={position} rotation={[0, 0, 0]}>
      <planeGeometry args={[size[0], size[1]]} />
      {videoTexture ? (
        <meshBasicMaterial map={videoTexture} side={THREE.DoubleSide} />
      ) : (
        <meshBasicMaterial color="#1a1a1a" side={THREE.DoubleSide} />
      )}
    </mesh>
  )
}
