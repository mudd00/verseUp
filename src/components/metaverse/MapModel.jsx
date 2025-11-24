import { useEffect, Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import ErrorBoundary from './ErrorBoundary'
import Portal from './Portal'

// 맵별 설정
const MAP_CONFIG = {
  main: {
    path: '/models/map.glb',
    portalPosition: [-1.35, 1.0, -7.11],
    portalSize: [3, 4, 3],
    portalTarget: 'school',
    portalLabel: '학교 입장',
  },
  school: {
    path: '/models/classroom.glb',
    portalPosition: [0, 1.0, 8],
    portalSize: [3, 4, 3],
    portalTarget: 'main',
    portalLabel: '메인 맵으로',
  },
}

function DefaultFloor() {
  return (
    <RigidBody type="fixed" position={[0, -0.1, 0]}>
      <CuboidCollider args={[50, 0.1, 50]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
    </RigidBody>
  )
}

function LoadingPlaceholder() {
  return (
    <RigidBody type="fixed" position={[0, -0.1, 0]}>
      <CuboidCollider args={[50, 0.1, 50]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
    </RigidBody>
  )
}

function MapModelContent({ currentMap, onMapChange, onPortalNearChange }) {
  const config = MAP_CONFIG[currentMap] || MAP_CONFIG.main
  const { scene } = useGLTF(config.path)

  // 3DCommunity 방식: useMemo로 씬 복제, 그림자 설정, 위치 조정을 모두 처리
  // (useEffect에서 하면 콜라이더와 메시 위치가 불일치함)
  const clonedScene = useMemo(() => {
    const cloned = scene.clone()

    // 그림자 설정
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    // 모델 크기 체크 및 스케일 조정
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())

    let appliedScale = 1
    if (size.x > 1000 || size.y > 1000 || size.z > 1000) {
      appliedScale = 100 / Math.max(size.x, size.y, size.z)
      cloned.scale.set(appliedScale, appliedScale, appliedScale)
    }

    // 바닥을 y=0에 맞추기
    cloned.updateMatrixWorld(true)
    const newBox = new THREE.Box3().setFromObject(cloned)
    const yOffset = -newBox.min.y
    cloned.position.y = yOffset

    return cloned
  }, [scene])

  return (
    <>
      {/* 3DCommunity 방식: RigidBody에 colliders="trimesh" 사용 */}
      <RigidBody type="fixed" colliders="trimesh" friction={1} restitution={0}>
        <primitive object={clonedScene} />
      </RigidBody>

      {/* 안전망 바닥 콜라이더 (맵 밖으로 떨어질 경우 대비) */}
      <RigidBody type="fixed" position={[0, -5, 0]}>
        <CuboidCollider args={[100, 0.1, 100]} />
      </RigidBody>

      <Portal
        position={config.portalPosition}
        size={config.portalSize}
        targetMap={config.portalTarget}
        label={config.portalLabel}
        onEnter={onMapChange}
        onNearChange={onPortalNearChange}
      />
    </>
  )
}

export default function MapModel({ currentMap, onMapChange, onPortalNearChange }) {
  return (
    <ErrorBoundary fallback={<DefaultFloor />}>
      <Suspense fallback={<LoadingPlaceholder />}>
        <MapModelContent
          currentMap={currentMap}
          onMapChange={onMapChange}
          onPortalNearChange={onPortalNearChange}
        />
      </Suspense>
    </ErrorBoundary>
  )
}

// 두 맵 모두 preload
useGLTF.preload('/models/map.glb')
useGLTF.preload('/models/classroom.glb')
