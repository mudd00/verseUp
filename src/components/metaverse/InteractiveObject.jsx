import { RigidBody, CuboidCollider } from '@react-three/rapier'

export default function InteractiveObject({
  position = [0, 0, 0],
  sittingPosition, // 실제 앉는 위치 (의자만)
  size = [1, 1, 1],
  onNearChange,
  objectId,
  label,
  type, // 'sit' | 'stand'
}) {
  // 앉는 위치가 지정되어 있으면 사용, 아니면 센서 위치 사용
  const actualSittingPosition = sittingPosition || position

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider
        args={[size[0] / 2, size[1] / 2, size[2] / 2]}
        sensor
        onIntersectionEnter={() => onNearChange?.({ isNear: true, objectId, label, type, position: actualSittingPosition })}
        onIntersectionExit={() => onNearChange?.({ isNear: false, objectId: null, label: null, type: null, position: null })}
      />
    </RigidBody>
  )
}
