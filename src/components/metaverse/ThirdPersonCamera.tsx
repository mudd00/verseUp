import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import * as THREE from 'three'

interface ThirdPersonCameraProps {
  target: React.RefObject<THREE.Group>
  onAngleChange?: (angle: number) => void
}

export default function ThirdPersonCamera({ target, onAngleChange }: ThirdPersonCameraProps) {
  const { camera, gl } = useThree()
  const currentPosition = useRef(new Vector3())
  const currentLookAt = useRef(new Vector3())

  // 카메라 회전 각도 (라디안)
  const [azimuthAngle, setAzimuthAngle] = useState(0) // 좌우 회전 (Y축)
  const [polarAngle, setPolarAngle] = useState(Math.PI / 4) // 상하 각도 (45도)
  const [distance, setDistance] = useState(8) // 카메라 거리

  // Pointer Lock 상태
  const isLocked = useRef(false)

  useEffect(() => {
    const canvas = gl.domElement

    // 포인터 락 요청
    const handleClick = () => {
      if (!isLocked.current) {
        canvas.requestPointerLock()
      }
    }

    // 포인터 락 상태 변경
    const handlePointerLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas
      if (isLocked.current) {
        canvas.style.cursor = 'none'
      } else {
        canvas.style.cursor = 'pointer'
      }
    }

    // 마우스 이동 (Pointer Lock 사용)
    const handleMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return

      // movementX/Y는 마우스의 실제 이동량
      const deltaX = e.movementX
      const deltaY = e.movementY

      // 좌우 회전 (마우스 왼쪽 = 왼쪽 회전, 마우스 오른쪽 = 오른쪽 회전)
      setAzimuthAngle(prev => {
        const newAngle = prev - deltaX * 0.003
        onAngleChange?.(newAngle)
        return newAngle
      })

      // 상하 각도 (마우스가 위로 가면 카메라도 위로 - 반전 제거)
      setPolarAngle(prev => {
        const newAngle = prev - deltaY * 0.003
        // 최소: 거의 위에서 보기, 최대: 거의 바닥
        return Math.max(0.1, Math.min(Math.PI / 2 - 0.1, newAngle))
      })
    }

    // 마우스 휠 (줌)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      setDistance(prev => {
        const newDistance = prev + e.deltaY * 0.01
        // 최소: 3, 최대: 20
        return Math.max(3, Math.min(20, newDistance))
      })
    }

    // ESC 키로 포인터 락 해제
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLocked.current) {
        document.exitPointerLock()
      }
    }

    // 이벤트 리스너 등록
    canvas.addEventListener('click', handleClick)
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    window.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)

    // 커서 스타일 초기 설정
    canvas.style.cursor = 'pointer'

    // 클린업
    return () => {
      canvas.removeEventListener('click', handleClick)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      window.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      canvas.style.cursor = 'default'
      if (isLocked.current) {
        document.exitPointerLock()
      }
    }
  }, [gl])

  useFrame(() => {
    if (!target.current) return

    // 캐릭터의 월드 위치 가져오기
    const targetPosition = new Vector3()
    target.current.getWorldPosition(targetPosition)

    // 구면 좌표계를 사용하여 카메라 위치 계산 (180도 회전하여 등 뒤에서 바라봄)
    const offsetX = distance * Math.sin(polarAngle) * Math.sin(azimuthAngle + Math.PI)
    const offsetY = distance * Math.cos(polarAngle)
    const offsetZ = distance * Math.sin(polarAngle) * Math.cos(azimuthAngle + Math.PI)

    // 목표 카메라 위치
    const idealPosition = new Vector3()
    idealPosition.copy(targetPosition)
    idealPosition.x += offsetX
    idealPosition.y += offsetY
    idealPosition.z += offsetZ

    // 카메라가 바라볼 위치 (캐릭터 중심, 약간 위)
    const idealLookAt = new Vector3()
    idealLookAt.copy(targetPosition)
    idealLookAt.y += 1.5 // 캐릭터 중심에서 약간 위

    // 부드러운 카메라 이동 (lerp)
    const t = 0.1 // 부드러움 정도

    currentPosition.current.lerp(idealPosition, t)
    currentLookAt.current.lerp(idealLookAt, t)

    camera.position.copy(currentPosition.current)
    camera.lookAt(currentLookAt.current)
  })

  return null
}
