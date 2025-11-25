import { useEffect, useRef } from 'react'
import { useAnimations } from '@react-three/drei'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - FBXLoader types are not properly exported
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

export default function CharacterModel({ isMoving = false }) {
  const idleFbx = useLoader(FBXLoader, '/models/Standing Idle.fbx')
  const walkingFbx = useLoader(FBXLoader, '/models/Walking.fbx')
  const group = useRef(null)

  // 두 애니메이션을 합쳐서 관리
  const allAnimations = [...idleFbx.animations, ...walkingFbx.animations]
  const { actions } = useAnimations(allAnimations, group)

  useEffect(() => {
    console.log('✅ Mixamo 캐릭터 로드 완료!')
    console.log('📦 애니메이션 개수:', allAnimations.length)

    if (allAnimations.length > 0) {
      allAnimations.forEach((clip, i) => {
        console.log(`🎬 애니메이션 ${i}:`, clip.name)
      })
    }

    // FBX 모델 스케일 조정 (Mixamo는 보통 100배 크게 옴)
    if (group.current) {
      group.current.scale.set(0.01, 0.01, 0.01)
    }

    // 그림자 설정 (idle 모델만 렌더링하므로 idle에만 적용)
    idleFbx.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [idleFbx, walkingFbx, allAnimations])

  // 움직임에 따라 애니메이션 전환
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return

    // 애니메이션 이름으로 찾기 (allAnimations의 순서대로 [idle, walking])
    const idleAction = Object.values(actions)[0]  // Standing Idle
    const walkAction = Object.values(actions)[1]  // Walking

    if (isMoving) {
      // 움직일 때: Idle 중지, Walking 재생
      idleAction?.fadeOut(0.2)
      walkAction?.reset().fadeIn(0.2).play()
    } else {
      // 멈춰있을 때: Walking 중지, Idle 재생
      walkAction?.fadeOut(0.2)
      idleAction?.reset().fadeIn(0.2).play()
    }
  }, [isMoving, actions])

  return (
    <group ref={group}>
      <primitive object={idleFbx} />
    </group>
  )
}
