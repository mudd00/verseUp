import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

const DEFAULT_CAMERA_DISTANCE = 10
const DEFAULT_CAMERA_HEIGHT = 6
const SMOOTH_FACTOR_XZ = 5 // 수평 이동 부드러움
const SMOOTH_FACTOR_Y = 2 // 수직 이동 부드러움 (흔들림 감소)
const MOUSE_SENSITIVITY = 0.002
const ROTATION_SMOOTHING = 10 // 회전 스무딩

export default function ThirdPersonCamera({ target, onCameraRotate, distance = DEFAULT_CAMERA_DISTANCE, height = DEFAULT_CAMERA_HEIGHT }) {
  const { camera, gl } = useThree()
  const currentPosition = useRef(new THREE.Vector3())
  const smoothTargetY = useRef(0) // Y축 별도 스무딩

  // 목표 각도와 현재 각도 분리 (스무딩용)
  const targetAzimuth = useRef(0)
  const targetElevation = useRef(0.3)
  const currentAzimuth = useRef(0)
  const currentElevation = useRef(0.3)

  // 포인터 락으로 카메라 회전
  useEffect(() => {
    const canvas = gl.domElement

    const handleClick = () => {
      canvas.requestPointerLock()
    }

    const handleMouseMove = (e) => {
      if (document.pointerLockElement === canvas) {
        targetAzimuth.current -= e.movementX * MOUSE_SENSITIVITY
        targetElevation.current += e.movementY * MOUSE_SENSITIVITY
        // 수직 각도 제한 (너무 위나 아래 보지 않게)
        targetElevation.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetElevation.current))
      }
    }

    canvas.addEventListener('click', handleClick)
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      canvas.removeEventListener('click', handleClick)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [gl])

  useFrame((_, delta) => {
    if (!target?.current) return

    const safeDelta = Math.min(delta, 0.1)

    // 회전 스무딩 적용
    const rotationAlpha = 1 - Math.exp(-ROTATION_SMOOTHING * safeDelta)
    currentAzimuth.current += (targetAzimuth.current - currentAzimuth.current) * rotationAlpha
    currentElevation.current += (targetElevation.current - currentElevation.current) * rotationAlpha

    const targetPosition = new THREE.Vector3()
    target.current.getWorldPosition(targetPosition)

    // Y축은 별도로 더 부드럽게 추적
    const yLerpAlpha = 1 - Math.exp(-SMOOTH_FACTOR_Y * safeDelta)
    smoothTargetY.current += (targetPosition.y - smoothTargetY.current) * yLerpAlpha

    if (distance < 1) {
      // ===== 1인칭 모드 =====
      camera.position.set(
        targetPosition.x,
        smoothTargetY.current + height,
        targetPosition.z
      )

      camera.rotation.order = 'YXZ'
      camera.rotation.y = currentAzimuth.current
      camera.rotation.x = -currentElevation.current
      camera.rotation.z = 0
    } else {
      // ===== 3인칭 모드 =====
      const horizontalDistance = distance * Math.cos(currentElevation.current)
      const offsetX = horizontalDistance * Math.sin(currentAzimuth.current)
      const offsetZ = horizontalDistance * Math.cos(currentAzimuth.current)
      const offsetY = height + distance * Math.sin(currentElevation.current)

      const desiredPosition = new THREE.Vector3(
        targetPosition.x + offsetX,
        smoothTargetY.current + offsetY,
        targetPosition.z + offsetZ
      )

      const xzLerpAlpha = 1 - Math.exp(-SMOOTH_FACTOR_XZ * safeDelta)
      currentPosition.current.lerp(desiredPosition, xzLerpAlpha)
      camera.position.copy(currentPosition.current)

      // 캐릭터를 바라봄
      camera.lookAt(targetPosition.x, smoothTargetY.current, targetPosition.z)
    }

    // 카메라 회전 각도를 Player에 전달
    if (onCameraRotate) {
      onCameraRotate(currentAzimuth.current)
    }
  })

  return null
}
