import * as THREE from 'three'
import { useMemo, useEffect } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'

export default function Portal({
  position = [0, 0, 0],
  size = [2, 3, 2],
  onEnter,
  onNearChange,
  targetMap,
  label,
}) {
  const portalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#7c3aed',
        emissive: '#7c3aed',
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.6,
      }),
    []
  )

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider
        args={[size[0] / 2, size[1] / 2, size[2] / 2]}
        sensor
        onIntersectionEnter={() => onNearChange?.({ isNear: true, targetMap, label })}
        onIntersectionExit={() => onNearChange?.({ isNear: false, targetMap: null, label: null })}
      />
      <group>
        <mesh position={[0, size[1] / 2, 0]} material={portalMaterial}>
          <boxGeometry args={size} />
        </mesh>
      </group>
    </RigidBody>
  )
}
