import { useEffect, useRef, useMemo } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'

const IDLE = 'Idle'
const WALK = 'Walk'
const RUN = 'Run'
const SITDOWN = 'SitDown'

export default function CharacterModel({ isMoving = false, isSitting = false, scale = 0.8 }) {
  const group = useRef(null)
  const { scene, animations } = useGLTF('/models/BaseCharacter.gltf')

  // IMPORTANT: Clone the scene for each instance to avoid conflicts
  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene)
    console.log('🎭 CharacterModel cloned')
    return cloned
  }, [scene])

  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [clonedScene])

  useEffect(() => {
    // 사용 가능한 모든 애니메이션 출력
    console.log('📽️ 사용 가능한 애니메이션:', Object.keys(actions))

    const idleAction = actions[IDLE]
    if (idleAction) {
      idleAction.reset().fadeIn(0.2).play()
    }
  }, [actions])

  useEffect(() => {
    const idleAction = actions[IDLE]
    const walkAction = actions[WALK] || actions.Walking
    const runAction = actions[RUN]
    const sitAction = actions[SITDOWN]

    // 앉아있으면 SitDown 애니메이션 재생
    let targetAction
    if (isSitting) {
      targetAction = sitAction
      if (targetAction) {
        // SitDown 애니메이션은 한 번만 재생하고 마지막 프레임에서 멈춤
        targetAction.setLoop(THREE.LoopOnce, 1)
        targetAction.clampWhenFinished = true
      }
    } else {
      targetAction = isMoving ? runAction || walkAction : idleAction
      // 다른 애니메이션들은 루프 재생
      if (targetAction) {
        targetAction.setLoop(THREE.LoopRepeat)
      }
    }

    const others = [idleAction, walkAction, runAction, sitAction].filter(Boolean)

    if (!targetAction) return
    targetAction.reset().fadeIn(0.3).play()
    others.forEach((act) => {
      if (act !== targetAction) act.fadeOut(0.3)
    })
  }, [isMoving, isSitting, actions])

  return (
    <group ref={group} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  )
}

useGLTF.preload('/models/BaseCharacter.gltf')
