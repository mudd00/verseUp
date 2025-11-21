import { useEffect, useMemo, useRef } from 'react'
import { useLoader } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'

interface CharacterModelProps {
  isMoving?: boolean
}

/**
 * FBX 기반 캐릭터 로더 (Standing Idle + Walking)
 * - Walking.fbx: 스킨/메시 + 걷기 클립
 * - Standing Idle.fbx: 애니메이션만 포함
 * - GLB가 없을 때도 동작하도록 FBX 경로만 사용
 */
export default function CharacterModel({ isMoving = false }: CharacterModelProps) {
  // 애니/모델 로드
  const walkFbx = useLoader(FBXLoader, '/models/Walking.fbx') // with skin
  const idleFbx = useLoader(FBXLoader, '/models/Standing Idle.fbx') // anim-only

  // 스켈레톤/메시 클론 (원본 보호)
  const model = useMemo(() => SkeletonUtils.clone(walkFbx) as THREE.Group, [walkFbx])
  const modelRef = useRef<THREE.Object3D>(null)

  // 사용할 클립 리스트
  const clips = useMemo(() => [...idleFbx.animations, ...walkFbx.animations].filter(Boolean), [idleFbx, walkFbx])

  // 액션/믹서
  const { actions, mixer } = useAnimations(clips, modelRef)

  // 액션 선택 헬퍼: 명시 이름 → 키워드 포함 순
  const pickAction = (preferred: string[], keyword: string) => {
    if (!actions) return undefined
    for (const name of preferred) {
      if (name && actions[name]) return actions[name]
    }
    const entry = Object.entries(actions).find(([key]) => key.toLowerCase().includes(keyword.toLowerCase()))
    return entry ? entry[1] : undefined
  }

  // 스케일/그림자 1회 설정
  useEffect(() => {
    model.scale.set(0.5, 0.5, 0.5)
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [model])

  // 액션 이름 로그 (디버깅용)
  useEffect(() => {
    if (actions) {
      console.log('✅ 사용 가능한 액션:', Object.keys(actions))
    }
  }, [actions])

  // 초기 Idle/Walk 세팅 (T-포즈 최소화)
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !actions) return

    const idleCandidates = idleFbx.animations.map((clip) => clip.name)
    const walkCandidates = walkFbx.animations.map((clip) => clip.name)

    const idle = pickAction(idleCandidates, 'idle') || pickAction(idleCandidates, 'standing')
    const walk = pickAction(walkCandidates, 'walk')

    if (!idle) {
      console.error('❌ Idle 액션을 찾을 수 없습니다.')
      return
    }
    initialized.current = true

    idle.enabled = true
    walk && (walk.enabled = true)

    idle.reset()
    idle.time = 1 / 60
    idle.setEffectiveTimeScale(1)
    idle.setEffectiveWeight(1)
    idle.play()

    if (walk) {
      walk.reset()
      walk.time = 1 / 60
      walk.setEffectiveTimeScale(1)
      walk.setEffectiveWeight(0)
      walk.play()
    }

    mixer?.update(0)
  }, [actions, mixer, idleFbx.animations, walkFbx.animations])

  // 이동 여부에 따른 전환
  useEffect(() => {
    if (!actions) return

    const idleCandidates = idleFbx.animations.map((clip) => clip.name)
    const walkCandidates = walkFbx.animations.map((clip) => clip.name)

    const idle = pickAction(idleCandidates, 'idle') || pickAction(idleCandidates, 'standing')
    const walk = pickAction(walkCandidates, 'walk')

    if (isMoving) {
      if (walk && idle) {
        walk.setEffectiveWeight(1)
        idle.crossFadeTo(walk, 0.15, false)
      } else {
        walk?.reset().fadeIn(0.15).play()
        idle?.fadeOut(0.15)
      }
    } else {
      if (walk && idle) {
        idle.setEffectiveWeight(1)
        walk.crossFadeTo(idle, 0.15, false)
      } else {
        walk?.fadeOut(0.15)
        idle?.reset().fadeIn(0.15).play()
      }
    }
  }, [isMoving, actions, idleFbx.animations, walkFbx.animations])

  return <primitive ref={modelRef} object={model} />
}
