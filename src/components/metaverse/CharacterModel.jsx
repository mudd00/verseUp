import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'

const IDLE = 'Idle'
const WALK = 'Walk'
const RUN = 'Run'
const SITDOWN = 'SitDown'

export default function CharacterModel({ isMoving = false, isSitting = false }) {
  const group = useRef(null)
  const { scene, animations } = useGLTF('/models/BaseCharacter.gltf')
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

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
    <group ref={group} scale={0.8}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/BaseCharacter.gltf')
