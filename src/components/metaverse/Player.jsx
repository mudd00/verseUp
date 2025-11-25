import { useRef, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, useBeforePhysicsStep } from '@react-three/rapier'
import { useKeyboardControls } from './useKeyboardControls.js'
import CharacterModel from './CharacterModel.jsx'

const Player = forwardRef(({ cameraAngle }, ref) => {
  const playerRef = useRef(null)
  const characterRef = useRef(null)
  const { forward, backward, left, right, jump } = useKeyboardControls()

  const MOVE_SPEED = 5
  const JUMP_FORCE = 7
  const MAX_VELOCITY = 10

  // ref를 외부에 노출
  useImperativeHandle(ref, () => characterRef.current)

  // 캐릭터 회전을 카메라와 동기화 (렌더링 루프)
  useFrame(() => {
    if (!characterRef.current) return

    // 캐릭터를 항상 카메라 방향으로 회전
    characterRef.current.rotation.y = cameraAngle
  })

  // 물리 업데이트는 Rapier의 beforePhysicsStep에서 처리
  useBeforePhysicsStep((_world) => {
    if (!playerRef.current) return

    // 카메라 방향 기준 로컬 이동
    let moveForward = 0  // 앞뒤
    let moveSide = 0     // 좌우

    if (forward) moveForward += 1   // W: 앞으로
    if (backward) moveForward -= 1  // S: 뒤로
    if (left) moveSide += 1         // A: 왼쪽으로
    if (right) moveSide -= 1        // D: 오른쪽으로

    const isMoving = moveForward !== 0 || moveSide !== 0

    if (isMoving) {
      // 카메라 각도를 기준으로 월드 좌표로 변환
      // 카메라가 보는 방향이 앞(forward)
      const forwardX = Math.sin(cameraAngle)
      const forwardZ = Math.cos(cameraAngle)

      // 카메라 기준 오른쪽 방향
      const rightX = Math.cos(cameraAngle)
      const rightZ = -Math.sin(cameraAngle)

      // 최종 이동 방향 = 앞뒤 방향 + 좌우 방향
      const moveX = forwardX * moveForward + rightX * moveSide
      const moveZ = forwardZ * moveForward + rightZ * moveSide

      // 이동 벡터 정규화 (대각선 이동시 속도 일정하게)
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ)
      const normalizedX = moveX / length
      const normalizedZ = moveZ / length

      const impulse = {
        x: normalizedX * MOVE_SPEED,
        y: 0,
        z: normalizedZ * MOVE_SPEED
      }

      playerRef.current.applyImpulse(impulse, true)
    }

    // 점프
    if (jump) {
      const velocity = playerRef.current.linvel()
      if (Math.abs(velocity.y) < 0.5) {
        playerRef.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true)
      }
    }

    // 최대 속도 제한
    const vel = playerRef.current.linvel()
    if (Math.abs(vel.x) > MAX_VELOCITY || Math.abs(vel.z) > MAX_VELOCITY) {
      playerRef.current.setLinvel(
        {
          x: Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, vel.x)),
          y: vel.y,
          z: Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, vel.z)),
        },
        true
      )
    }
  })

  return (
    <RigidBody
      ref={playerRef}
      colliders={false}
      position={[0, 3, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={0.5}
      angularDamping={1}
      friction={1}
      mass={1}
      restitution={0}
      lockRotations
    >
      <CapsuleCollider args={[0.5, 0.5]} />

      <group ref={characterRef}>
        <CharacterModel isMoving={forward || backward || left || right} />
      </group>
    </RigidBody>
  )
})

Player.displayName = 'Player'

export default Player
