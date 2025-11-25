import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'

const IDLE = 'Idle'
const WALK = 'Walk'
const RUN = 'Run'

export default function CharacterModel({ isMoving = false }) {
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
    const idleAction = actions[IDLE]
    if (idleAction) {
      idleAction.reset().fadeIn(0.2).play()
    }
  }, [actions])

  useEffect(() => {
    const idleAction = actions[IDLE]
    const walkAction = actions[WALK] || actions.Walking
    const runAction = actions[RUN]
    const targetAction = isMoving ? runAction || walkAction : idleAction
    const others = [idleAction, walkAction, runAction].filter(Boolean)

    if (!targetAction) return
    targetAction.reset().fadeIn(0.2).play()
    others.forEach((act) => {
      if (act !== targetAction) act.fadeOut(0.2)
    })
  }, [isMoving, actions])

  return (
    <group ref={group} scale={0.8}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/BaseCharacter.gltf')
