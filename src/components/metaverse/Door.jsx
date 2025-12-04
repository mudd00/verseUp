import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'

export default function Door({
  position = [0, 0, 0],
  size = [2, 3, 0.5],
  onNearChange,
  doorId,
  label,
}) {
  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider
        args={[size[0] / 2, size[1] / 2, size[2] / 2]}
        sensor
        onIntersectionEnter={() => onNearChange?.({ isNear: true, doorId, label })}
        onIntersectionExit={() => onNearChange?.({ isNear: false, doorId: null, label: null })}
      />
      {/* 디버그용 시각화 (필요시 주석 해제) */}
      {/* <mesh position={[0, size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#00ff00" transparent opacity={0.3} />
      </mesh> */}
    </RigidBody>
  )
}
