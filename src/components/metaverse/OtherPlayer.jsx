import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import CharacterModel from './CharacterModel.jsx'
import * as THREE from 'three'

/**
 * 다른 플레이어 렌더링 컴포넌트
 * @param {Object} props
 * @param {string} props.socketId - 플레이어 소켓 ID
 * @param {Object} props.user - 사용자 정보 (name, role 등)
 * @param {Array} props.position - 현재 위치 [x, y, z]
 * @param {number} props.rotation - Y축 회전값
 * @param {string} props.animation - 현재 애니메이션 ('idle' or 'walk')
 */
export default function OtherPlayer({ socketId, user, position, rotation, animation }) {
  const groupRef = useRef()
  const targetPosition = useRef(new THREE.Vector3(...position))
  const targetRotation = useRef(rotation)
  const currentPosition = useRef(new THREE.Vector3(...position))
  const currentRotation = useRef(rotation)

  // 위치 및 회전 업데이트 시 타겟 설정
  useEffect(() => {
    if (position) {
      targetPosition.current.set(position[0], position[1], position[2])
    }
  }, [position])

  useEffect(() => {
    if (rotation !== undefined) {
      targetRotation.current = rotation
    }
  }, [rotation])

  // 부드러운 보간 (lerp)
  useFrame(() => {
    if (!groupRef.current) return

    // 위치 보간 (lerp factor: 0.1)
    currentPosition.current.lerp(targetPosition.current, 0.1)
    groupRef.current.position.copy(currentPosition.current)

    // 회전 보간
    const rotationDiff = targetRotation.current - currentRotation.current
    currentRotation.current += rotationDiff * 0.1
    groupRef.current.rotation.y = currentRotation.current
  })

  return (
    <group ref={groupRef} position={position}>
      {/* 캐릭터 모델 */}
      <CharacterModel isMoving={animation === 'walk'} />

      {/* 이름표 */}
      <mesh position={[0, 2.5, 0]}>
        <planeGeometry args={[1.5, 0.3]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.8} />
      </mesh>
      <Text
        position={[0, 2.5, 0.01]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {user?.name || 'Player'}
      </Text>
    </group>
  )
}
