import { useEffect, Suspense, useMemo, useState, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import ErrorBoundary from './ErrorBoundary'
import Portal from './Portal'
import Door from './Door'
import InteractiveObject from './InteractiveObject'
import Blackboard from './Blackboard'

// 문 비주얼 컴포넌트 (애니메이션을 따라가는 별도 메시들)
function AnimatedDoorVisual({ doorData }) {
  const groupRef = useRef()

  useFrame(() => {
    if (groupRef.current && doorData?.mesh) {
      // 원본 문 그룹의 world transform을 복사
      doorData.mesh.updateMatrixWorld(true)
      groupRef.current.matrixAutoUpdate = false
      groupRef.current.matrix.copy(doorData.mesh.matrixWorld)
    }
  })

  if (!doorData || !doorData.meshes) return null

  return (
    <group ref={groupRef}>
      {doorData.meshes.map((meshData, index) => (
        <mesh
          key={index}
          geometry={meshData.geometry}
          material={meshData.material}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  )
}

// 문 콜라이더 컴포넌트 (애니메이션을 따라가는 kinematic 콜라이더)
function AnimatedDoorCollider({ doorData }) {
  const rigidBodyRef = useRef(null)
  const positionVec = useMemo(() => new THREE.Vector3(), [])
  const quaternionVec = useMemo(() => new THREE.Quaternion(), [])

  useFrame(() => {
    if (rigidBodyRef.current && doorData?.mesh) {
      doorData.mesh.updateMatrixWorld(true)
      doorData.mesh.getWorldPosition(positionVec)
      doorData.mesh.getWorldQuaternion(quaternionVec)

      // 문 피벗에서 문 중심으로 오프셋
      const offset = new THREE.Vector3(0, -1.0, 0.5)
      offset.applyQuaternion(quaternionVec)

      rigidBodyRef.current.setTranslation(
        {
          x: positionVec.x + offset.x,
          y: positionVec.y + offset.y,
          z: positionVec.z + offset.z
        },
        true
      )
      rigidBodyRef.current.setRotation(
        { x: quaternionVec.x, y: quaternionVec.y, z: quaternionVec.z, w: quaternionVec.w },
        true
      )
    }
  })

  if (!doorData) return null

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="kinematicPosition"
      colliders={false}
    >
      <CuboidCollider args={[0.1, 1.2, 0.5]} />
    </RigidBody>
  )
}

// 맵별 설정
const MAP_CONFIG = {
  main: {
    path: '/models/map.glb',
    portalPosition: [-1.35, 1.0, -7.11],
    portalSize: [3, 4, 3],
    portalTarget: 'school',
    portalLabel: '학교 입장',
    // 두 번째 포탈 (애니메 학교로)
    portal2Position: [5, 1.0, -7.11],
    portal2Size: [3, 4, 3],
    portal2Target: 'anime',
    portal2Label: '애니메 학교 입장',
  },
  school: {
    path: '/models/classroom.glb',
    portalPosition: [0, 1.0, -5],
    portalSize: [3, 4, 3],
    portalTarget: 'main',
    portalLabel: '메인 맵으로',
  },
  anime: {
    path: '/models/anime_school.glb',
    portalPosition: [0, 1.0, 28],
    portalSize: [3, 4, 3],
    portalTarget: 'main',
    portalLabel: '메인 맵으로',
    // 문 애니메이션 설정
    animatedDoors: [
      {
        doorId: 'anime_left_door',
        position: [-25.92, 0.60, -15.02],
        size: [2, 3, 2],
        label: '문 열기 (F)',
        meshName: 'F1 Left_Door 1',
        animationName: 'F1 DoorOpen_Left 1',
      },
    ],
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

function MapModelContent({ currentMap, onMapChange, onPortalNearChange, onDoorNearChange, onObjectNearChange, onLoad }) {
  const config = MAP_CONFIG[currentMap] || MAP_CONFIG.main
  const { scene, animations } = useGLTF(config.path)
  const sceneRef = useRef()
  const { actions } = useAnimations(animations, sceneRef)
  const [doorPositions, setDoorPositions] = useState([])
  const [interactiveObjects, setInteractiveObjects] = useState([])
  const [openedDoors, setOpenedDoors] = useState({})  // 열린 문 상태 추적

  // 문 애니메이션 재생 함수 (열기/닫기 토글)
  const playDoorAnimation = (animationName, doorId) => {
    console.log('🚪 문 애니메이션:', animationName, '현재 상태:', openedDoors[doorId] ? '열림' : '닫힘')
    const action = actions[animationName]
    if (action) {
      const isOpen = openedDoors[doorId]

      if (isOpen) {
        // 닫기: 역재생 (1.5배속)
        action.paused = false
        action.timeScale = -1.5
        action.setLoop(THREE.LoopOnce, 1)
        action.play()
        setOpenedDoors(prev => ({ ...prev, [doorId]: false }))
        console.log('🚪 문 닫기 애니메이션')
      } else {
        // 열기: 정방향 재생 (1.5배속)
        action.reset()
        action.timeScale = 1.5
        action.setLoop(THREE.LoopOnce, 1)
        action.clampWhenFinished = true
        action.play()
        setOpenedDoors(prev => ({ ...prev, [doorId]: true }))
        console.log('🚪 문 열기 애니메이션')
      }
    } else {
      console.warn('❌ 애니메이션을 찾을 수 없음:', animationName)
    }
  }

  // 맵 로딩 완료 알림
  useEffect(() => {
    console.log('🗺️ [MapModel] Map loaded:', currentMap)
    if (onLoad) {
      onLoad()
    }
  }, [currentMap, onLoad])

  // 3DCommunity 방식: useMemo로 씬 복제, 그림자 설정, 위치 조정을 모두 처리
  // (useEffect에서 하면 콜라이더와 메시 위치가 불일치함)
  const clonedScene = useMemo(() => {
    const cloned = scene.clone()
    const foundDoors = []
    const foundObjects = []
    let foundBlackboardMesh = null

    // 그림자 설정 및 상호작용 요소 찾기
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true

        if (currentMap === 'school') {
          // 디버깅: 학교 맵의 모든 메시 이름 출력
          if (child.name) {
            console.log(`🔍 메시:`, child.name)
          }

          // 칠판 메시 찾기 (VERDE_GRANDE_StingrayPBS7_0)
          if (child.name === 'VERDE_GRANDE_StingrayPBS7_0') {
            console.log(`🎨 칠판 메시 발견!:`, child.name, child)

            // 메시 크기 확인
            child.geometry.computeBoundingBox()
            const bbox = child.geometry.boundingBox
            const width = bbox.max.x - bbox.min.x
            const height = bbox.max.y - bbox.min.y
            const depth = bbox.max.z - bbox.min.z
            console.log(`📏 칠판 메시 크기: 가로=${width.toFixed(2)}, 세로=${height.toFixed(2)}, 깊이=${depth.toFixed(2)}`)
            console.log(`📏 칠판 가로:세로 비율 = ${(width/height).toFixed(2)}:1`)

            // ⭐ UV 범위 분석
            if (child.geometry.attributes.uv) {
              const uv = child.geometry.attributes.uv.array
              let minU = 1, maxU = 0, minV = 1, maxV = 0

              // UV array는 [u0, v0, u1, v1, u2, v2, ...] 형식
              for (let i = 0; i < uv.length; i += 2) {
                const u = uv[i]
                const v = uv[i + 1]
                minU = Math.min(minU, u)
                maxU = Math.max(maxU, u)
                minV = Math.min(minV, v)
                maxV = Math.max(maxV, v)
              }

              console.log(`📐 Blackboard Mesh UV Range`)
              console.log(`  U: ${minU.toFixed(3)} ~ ${maxU.toFixed(3)}`)
              console.log(`  V: ${minV.toFixed(3)} ~ ${maxV.toFixed(3)}`)
              console.log(`  V Usage: ${((maxV - minV) * 100).toFixed(1)}%`)
            }

            foundBlackboardMesh = child
          }

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

    // anime 맵에서 문 처리: visible=false로 trimesh에서 제외
    let doorData = null
    if (currentMap === 'anime') {
      // 전체 오브젝트 이름 출력
      const allNames = []
      cloned.traverse((child) => {
        if (child.name) {
          allNames.push(`${child.name} (${child.type})`)
        }
      })
      console.log('🔍 anime 맵 전체 오브젝트:', allNames)

      // 문 관련 오브젝트 찾기
      cloned.traverse((child) => {
        const nameLower = child.name.toLowerCase()
        if (nameLower.includes('door') || nameLower.includes('left') || child.name.includes('F1')) {
          console.log('🚪 문 후보:', child.name, 'type:', child.type, 'isMesh:', child.isMesh)
        }
      })

      // 정확한 이름으로 찾기 - visible=false로 trimesh에서 제외
      cloned.traverse((child) => {
        if (child.name === 'anime_left_door' || child.name === 'F1 Left_Door 1' || child.name === 'F1_Left_Door_1') {
          console.log('🚪 문 발견:', child.name)

          if (child.isMesh && child.geometry) {
            doorData = {
              mesh: child,
              meshes: [{ geometry: child.geometry.clone(), material: child.material }]
            }
            child.visible = false
            console.log('🚪 문 visible=false 설정:', child.name)
          } else {
            // 그룹인 경우 모든 하위 메시들 저장
            const meshes = []
            child.traverse((subChild) => {
              if (subChild.isMesh && subChild.geometry) {
                meshes.push({
                  geometry: subChild.geometry.clone(),
                  material: subChild.material
                })
                subChild.visible = false
                console.log('🚪 문 하위 메시 visible=false:', subChild.name)
              }
            })
            if (meshes.length > 0) {
              doorData = {
                mesh: child,
                meshes: meshes
              }
            }
          }
        }
      })

      if (!doorData) {
        console.warn('⚠️ 문을 찾지 못했습니다!')
      }
    }

    return { cloned, foundBlackboardMesh, doorData }
  }, [scene, currentMap])

  return (
    <>
      {/* 3DCommunity 방식: RigidBody에 colliders="trimesh" 사용 */}
      {/* anime 맵의 경우 문 geometry가 비어있어서 trimesh에서 제외됨 */}
      <RigidBody type="fixed" colliders="trimesh" friction={1} restitution={0}>
        <primitive ref={sceneRef} object={clonedScene.cloned} />
      </RigidBody>

      {/* anime 맵: 문 비주얼 별도 렌더링 (애니메이션 따라감) */}
      {currentMap === 'anime' && clonedScene.doorData && (
        <AnimatedDoorVisual doorData={clonedScene.doorData} />
      )}

      {/* anime 맵: 문 콜라이더 (애니메이션 따라감) */}
      {currentMap === 'anime' && clonedScene.doorData && (
        <AnimatedDoorCollider doorData={clonedScene.doorData} />
      )}

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

      {/* 두 번째 포탈 (있는 경우에만) */}
      {config.portal2Position && (
        <Portal
          position={config.portal2Position}
          size={config.portal2Size}
          targetMap={config.portal2Target}
          label={config.portal2Label}
          onEnter={onMapChange}
          onNearChange={onPortalNearChange}
        />
      )}

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
              label={door.doorId === 'door1' ? '강의실 A 입장 (F)' : '교실 2 입장 (F)'}
              onNearChange={onDoorNearChange}
            />
            {/* 문 안쪽 - 나가기 전용 (얇게) */}
            <Door
              position={insidePosition}
              size={[3, 4, 0.5]}
              doorId={`${door.doorId}_exit`}
              label={door.doorId === 'door1' ? '강의실 A 나가기 (F)' : '교실 2 나가기 (F)'}
              onNearChange={onDoorNearChange}
            />
          </group>
        )
      })}

      {/* 애니메이션이 있는 문 (anime 맵 등) */}
      {config.animatedDoors?.map((door) => (
        <Door
          key={door.doorId}
          position={door.position}
          size={door.size}
          doorId={door.doorId}
          label={openedDoors[door.doorId] ? '문 닫기 (F)' : door.label}
          onNearChange={(info) => onDoorNearChange?.({
            ...info,
            playAnimation: () => playDoorAnimation(door.animationName, door.doorId),
            isOpened: openedDoors[door.doorId],
          })}
        />
      ))}

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

      {/* 칠판 (학교 맵에만 표시) */}
      {currentMap === 'school' && clonedScene.foundBlackboardMesh && (
        <Blackboard targetMesh={clonedScene.foundBlackboardMesh} />
      )}
    </>
  )
}

export default function MapModel({ currentMap, onMapChange, onPortalNearChange, onDoorNearChange, onObjectNearChange, onLoad }) {
  return (
    <ErrorBoundary fallback={<DefaultFloor />}>
      <Suspense fallback={<LoadingPlaceholder />}>
        <MapModelContent
          currentMap={currentMap}
          onMapChange={onMapChange}
          onPortalNearChange={onPortalNearChange}
          onDoorNearChange={onDoorNearChange}
          onObjectNearChange={onObjectNearChange}
          onLoad={onLoad}
        />
      </Suspense>
    </ErrorBoundary>
  )
}

// 모든 맵 preload
useGLTF.preload('/models/map.glb')
useGLTF.preload('/models/classroom.glb')
useGLTF.preload('/models/anime_school.glb')
