import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface CharacterModelProps {
  isMoving?: boolean
}

export default function CharacterModel({ isMoving = false }: CharacterModelProps) {
  const fbx = useLoader(FBXLoader, '/models/Walking.fbx')
  const group = useRef<THREE.Group>(null)

  // FBX 애니메이션 설정
  const { actions } = useAnimations(fbx.animations, group)

  useEffect(() => {
    console.log('✅ Mixamo 캐릭터 로드 완료!')
    console.log('📦 애니메이션 개수:', fbx.animations.length)

    if (fbx.animations.length > 0) {
      fbx.animations.forEach((clip, i) => {
        console.log(`🎬 애니메이션 ${i}:`, clip.name)
      })
    }

    // FBX 모델 스케일 조정 (Mixamo는 보통 100배 크게 옴)
    if (group.current) {
      group.current.scale.set(0.01, 0.01, 0.01)
    }

    // 그림자 설정
    fbx.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [fbx])

  // 움직임에 따라 애니메이션 전환
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return

    const walkAction = Object.values(actions)[0]

    if (isMoving) {
      // 움직일 때: Walking 애니메이션 재생
      walkAction?.fadeIn(0.2).play()
    } else {
      // 멈춰있을 때: 애니메이션 중지 (첫 프레임으로 고정)
      walkAction?.fadeOut(0.2)
      walkAction?.stop()
    }
  }, [isMoving, actions])

  return (
    <group ref={group}>
      <primitive object={fbx} />
    </group>
  )
}
