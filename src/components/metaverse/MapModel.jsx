import { useEffect, Suspense, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import ErrorBoundary from './ErrorBoundary'
import Portal from './Portal'
import Door from './Door'
import InteractiveObject from './InteractiveObject'

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
    portalPosition: [0, 1.0, -5],  // 학교 안쪽으로 이동 (임시)
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

function MapModelContent({ currentMap, onMapChange, onPortalNearChange, onDoorNearChange, onObjectNearChange }) {
  const config = MAP_CONFIG[currentMap] || MAP_CONFIG.main
  const { scene } = useGLTF(config.path)
  const [doorPositions, setDoorPositions] = useState([])
  const [interactiveObjects, setInteractiveObjects] = useState([])

  // 3DCommunity 방식: useMemo로 씬 복제, 그림자 설정, 위치 조정을 모두 처리
  // (useEffect에서 하면 콜라이더와 메시 위치가 불일치함)
  const clonedScene = useMemo(() => {
    const cloned = scene.clone()
    const foundDoors = []
    const foundObjects = []

    // 그림자 설정 및 상호작용 요소 찾기
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true

        if (currentMap === 'school') {
          // 문 요소 찾기
          if (child.name === 'PUERTA_1_StingrayPBS9_0' || child.name === 'PUERTA_4_StingrayPBS9_0') {
            const worldPos = new THREE.Vector3()
            child.getWorldPosition(worldPos)
            const doorId = child.name === 'PUERTA_1_StingrayPBS9_0' ? 'door1' : 'door2'
            foundDoors.push({
              name: child.name,
              position: [worldPos.x, worldPos.y, worldPos.z],
              doorId: doorId,
            })
          }
          // 의자 요소 찾기 (ASIENTO로 시작)
          else if (child.name.startsWith('ASIENTO')) {
            const worldPos = new THREE.Vector3()
            child.getWorldPosition(worldPos)
            foundObjects.push({
              name: child.name,
              position: [worldPos.x, worldPos.y, worldPos.z],
              sittingPosition: [worldPos.x, worldPos.y + 0.8, worldPos.z + 0], // Y축 +0.8 (더 높게), Z축 +0.2 (앞으로)
              objectId: `chair_${child.name}`,
              type: 'sit',
              label: '의자에 앉기 (F)',
            })
            console.log(`💺 의자 발견:`, child.name, worldPos)
          }
          // 교탁 요소 찾기
          else if (child.name === 'METAL_PROF_StingrayPBS6_0') {
            const worldPos = new THREE.Vector3()
            child.getWorldPosition(worldPos)
            foundObjects.push({
              name: child.name,
              position: [worldPos.x, worldPos.y, worldPos.z],
              objectId: 'desk',
              type: 'stand',
              label: '교탁에 서기 (F)',
            })
            console.log(`🎓 교탁 발견:`, child.name, worldPos)
          }
        }
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

    // 문 위치도 스케일과 오프셋 적용
    if (foundDoors.length > 0) {
      console.log(`📏 스케일 적용: scale=${appliedScale}, yOffset=${yOffset}`)
      foundDoors.forEach(door => {
        const originalPos = [...door.position]
        door.position[0] *= appliedScale
        door.position[1] = door.position[1] * appliedScale + yOffset
        door.position[2] *= appliedScale
        console.log(`${door.doorId} 최종 위치:`, {
          원본: originalPos,
          스케일후: door.position,
        })
      })
      setDoorPositions(foundDoors)
    }

    // 상호작용 객체 위치도 스케일과 오프셋 적용
    if (foundObjects.length > 0) {
      console.log(`📦 상호작용 객체 발견: ${foundObjects.length}개`)
      foundObjects.forEach(obj => {
        const originalPos = [...obj.position]
        obj.position[0] *= appliedScale
        obj.position[1] = obj.position[1] * appliedScale + yOffset
        obj.position[2] *= appliedScale

        // sittingPosition도 스케일 적용 (의자만)
        if (obj.sittingPosition) {
          obj.sittingPosition[0] *= appliedScale
          obj.sittingPosition[1] = obj.sittingPosition[1] * appliedScale + yOffset
          obj.sittingPosition[2] *= appliedScale
        }

        console.log(`${obj.objectId} 최종 위치:`, {
          원본: originalPos,
          스케일후: obj.position,
          앉는위치: obj.sittingPosition,
        })
      })
      setInteractiveObjects(foundObjects)
    }

    return cloned
  }, [scene, currentMap])

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

      {/* 문 컴포넌트들 (학교 맵에서만) */}
      {doorPositions.map((door) => {
        // 각 문마다 안쪽과 바깥쪽 2개의 센서 생성
        const outsidePosition = [...door.position]
        const insidePosition = [...door.position]

        // 입장 포탈 위치 조정 (문 바깥쪽)
        outsidePosition[2] += 0.9 // Z축: 양수 = 바깥쪽, 음수 = 안쪽
        // outsidePosition[0] += 0  // X축: 양수 = 오른쪽, 음수 = 왼쪽
        // outsidePosition[1] += 0  // Y축: 양수 = 위, 음수 = 아래

        // 퇴장 포탈 위치 조정 (문 안쪽)
        insidePosition[2] -= 0.5  // Z축: 양수 = 더 안쪽, 음수 = 문쪽

        return (
          <group key={door.doorId}>
            {/* 문 바깥쪽 - 들어가기 전용 (얇게) */}
            <Door
              position={outsidePosition}
              size={[3, 4, 0.5]}
              doorId={`${door.doorId}_enter`}
              label={door.doorId === 'door1' ? '교실 1 입장 (F)' : '교실 2 입장 (F)'}
              onNearChange={onDoorNearChange}
            />
            {/* 문 안쪽 - 나가기 전용 (얇게) */}
            <Door
              position={insidePosition}
              size={[3, 4, 0.5]}
              doorId={`${door.doorId}_exit`}
              label={door.doorId === 'door1' ? '교실 1 나가기 (F)' : '교실 2 나가기 (F)'}
              onNearChange={onDoorNearChange}
            />
          </group>
        )
      })}

      {/* 상호작용 객체들 (의자, 교탁) */}
      {interactiveObjects.map((obj) => {
        const adjustedPosition = [...obj.position]

        // 객체별 위치 조정 (원하는 대로 수정 가능)
        if (obj.type === 'sit') {
          // 의자 위치 조정
          // adjustedPosition[0] += 0  // X축: 양수 = 오른쪽, 음수 = 왼쪽
          // adjustedPosition[1] += 0  // Y축: 양수 = 위, 음수 = 아래
          // adjustedPosition[2] += 0  // Z축: 양수 = 앞, 음수 = 뒤
        } else if (obj.type === 'stand') {
          // 교탁 위치를 직접 지정
          adjustedPosition[0] = -52.17
          adjustedPosition[1] = 1.87
          adjustedPosition[2] = -28.20
        }

        return (
          <InteractiveObject
            key={obj.objectId}
            position={adjustedPosition}
            sittingPosition={obj.sittingPosition} // 실제 앉는 위치 전달
            size={obj.type === 'sit' ? [0.8, 1.5, 0.8] : [1.5, 2, 1.5]} // 의자는 작게, 교탁은 크게
            objectId={obj.objectId}
            label={obj.label}
            type={obj.type}
            onNearChange={onObjectNearChange}
          />
        )
      })}
    </>
  )
}

export default function MapModel({ currentMap, onMapChange, onPortalNearChange, onDoorNearChange, onObjectNearChange }) {
  return (
    <ErrorBoundary fallback={<DefaultFloor />}>
      <Suspense fallback={<LoadingPlaceholder />}>
        <MapModelContent
          currentMap={currentMap}
          onMapChange={onMapChange}
          onPortalNearChange={onPortalNearChange}
          onDoorNearChange={onDoorNearChange}
          onObjectNearChange={onObjectNearChange}
        />
      </Suspense>
    </ErrorBoundary>
  )
}

// 두 맵 모두 preload
useGLTF.preload('/models/map.glb')
useGLTF.preload('/models/classroom.glb')
