import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

const DEFAULT_CAMERA_DISTANCE = 10
const DEFAULT_CAMERA_HEIGHT = 6
const SMOOTH_FACTOR_XZ = 5 // 수평 이동 부드러움
const SMOOTH_FACTOR_Y = 2 // 수직 이동 부드러움 (흔들림 감소)
const MOUSE_SENSITIVITY = 0.002

export default function ThirdPersonCamera({ target, onCameraRotate, distance = DEFAULT_CAMERA_DISTANCE, height = DEFAULT_CAMERA_HEIGHT }) {
  const { camera, gl } = useThree()
  const currentPosition = useRef(new THREE.Vector3())
  const smoothTargetY = useRef(0) // Y축 별도 스무딩
  const azimuthAngle = useRef(0) // 수평 각도 (Y축 회전)
  const elevationAngle = useRef(0.3) // 수직 각도 (위/아래)

  // 포인터 락으로 카메라 회전
  useEffect(() => {
    const canvas = gl.domElement

    const handleClick = () => {
      canvas.requestPointerLock()
    }

    const handleMouseMove = (e) => {
      if (document.pointerLockElement === canvas) {
        azimuthAngle.current -= e.movementX * MOUSE_SENSITIVITY
        elevationAngle.current += e.movementY * MOUSE_SENSITIVITY // 상하 정상 (마우스 위로 = 카메라 위로)
        // 수직 각도 제한 (너무 위나 아래 보지 않게)
        elevationAngle.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, elevationAngle.current))
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

    const targetPosition = new THREE.Vector3()
    target.current.getWorldPosition(targetPosition)

    // Y축은 별도로 더 부드럽게 추적
    const yLerpAlpha = 1 - Math.exp(-SMOOTH_FACTOR_Y * delta)
    smoothTargetY.current += (targetPosition.y - smoothTargetY.current) * yLerpAlpha

    if (distance < 1) {
      // ===== 1인칭 모드: 일반 FPS 게임 방식 =====
      // 카메라를 캐릭터 눈 높이에 정확히 배치
      camera.position.set(
        targetPosition.x,
        smoothTargetY.current + height,
        targetPosition.z
      )

      // 카메라 rotation을 직접 설정 (lookAt 대신)
      camera.rotation.order = 'YXZ' // Yaw-Pitch-Roll 순서
      camera.rotation.y = azimuthAngle.current + Math.PI // Yaw (좌우)
      camera.rotation.x = -elevationAngle.current // Pitch (상하)
      camera.rotation.z = 0 // Roll (기울기 없음)
    } else {
      // ===== 3인칭 모드: 기존 방식 =====
      // 마우스 회전 각도를 기반으로 카메라 오프셋 계산
      const horizontalDistance = distance * Math.cos(elevationAngle.current)
      const offsetX = horizontalDistance * Math.sin(azimuthAngle.current)
      const offsetZ = horizontalDistance * Math.cos(azimuthAngle.current)
      const offsetY = height + distance * Math.sin(elevationAngle.current)

      const desiredPosition = new THREE.Vector3(
        targetPosition.x + offsetX,
        smoothTargetY.current + offsetY,
        targetPosition.z + offsetZ
      )

      const xzLerpAlpha = 1 - Math.exp(-SMOOTH_FACTOR_XZ * delta)
      currentPosition.current.lerp(desiredPosition, xzLerpAlpha)
      camera.position.copy(currentPosition.current)

      // 3인칭: 캐릭터를 바라봄
      camera.lookAt(targetPosition.x, smoothTargetY.current, targetPosition.z)
    }

    // 카메라 회전 각도를 Player에 전달
    if (onCameraRotate) {
      // 1인칭일 때는 카메라가 180도 회전되어 있으므로 같은 각도 전달
      const playerAngle = distance < 1 ? azimuthAngle.current + Math.PI : azimuthAngle.current
      onCameraRotate(playerAngle)
    }
  })

  return null
}
