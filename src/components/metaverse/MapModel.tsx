import { useGLTF } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useEffect, Suspense } from 'react'
import * as THREE from 'three'
import ErrorBoundary from './ErrorBoundary'

// 기본 바닥 컴포넌트
function DefaultFloor() {
  return (
    <RigidBody type="fixed">
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>
    </RigidBody>
  )
}

// 로딩 중 표시
function LoadingPlaceholder() {
  return (
    <RigidBody type="fixed">
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
      {/* 로딩 텍스트 */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[5, 0.1, 5]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </RigidBody>
  )
}

// 맵 모델 컴포넌트
function MapModelContent() {
  const mapPath = '/models/map.glb'

  // useGLTF는 Suspense와 함께 사용되므로 try-catch로 감싸지 않음
  const gltf = useGLTF(mapPath)
  const scene = gltf.scene

  useEffect(() => {
    console.log('✅ 맵 모델 로드 완료!')
    console.log('📦 모델 정보:', scene)

    // 모델의 모든 메쉬 찾기
    let meshCount = 0
    const meshNames: string[] = []

    scene.traverse((child: any) => {
      if (child.isMesh) {
        meshCount++
        meshNames.push(child.name || 'unnamed')
        child.castShadow = true
        child.receiveShadow = true

        // 재질 확인 및 수정
        if (child.material) {
          // 양면 렌더링 활성화 (건물 내부도 보이게)
          child.material.side = THREE.DoubleSide
          child.visible = true

          // 재질이 투명하지 않도록 설정
          if (child.material.transparent) {
            child.material.transparent = false
            child.material.opacity = 1
          }
        }
      }
    })

    console.log(`🏗️ 총 ${meshCount}개의 메쉬 발견:`, meshNames)

    // 모델의 경계 상자 계산
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    console.log('📏 모델 크기:', size)
    console.log('📍 모델 중심:', center)

    // 모델이 너무 크면 스케일 조정
    if (size.x > 1000 || size.y > 1000 || size.z > 1000) {
      const scale = 100 / Math.max(size.x, size.y, size.z)
      scene.scale.set(scale, scale, scale)
      console.log('⚖️ 모델 스케일 조정:', scale)
    }

    // 모델을 바닥에 맞추기
    scene.position.y = -box.min.y
    console.log('🎯 모델 Y 위치 조정:', scene.position.y)

  }, [scene])

  return (
    <>
      {/* 맵 모델 (시각적만) */}
      <primitive object={scene} />

      {/* 확실한 바닥 충돌 박스 - 매우 얇은 박스 */}
      <RigidBody type="fixed" position={[0, -0.1, 0]} friction={2} restitution={0}>
        <CuboidCollider args={[500, 0.1, 500]} />
      </RigidBody>
    </>
  )
}

// 메인 컴포넌트 (ErrorBoundary + Suspense로 래핑)
export default function MapModel() {
  return (
    <ErrorBoundary fallback={<DefaultFloor />}>
      <Suspense fallback={<LoadingPlaceholder />}>
        <MapModelContent />
      </Suspense>
    </ErrorBoundary>
  )
}

// Preload the model
useGLTF.preload('/models/map.glb')
