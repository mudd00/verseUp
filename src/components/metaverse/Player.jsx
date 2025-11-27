import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody } from '@react-three/rapier'
import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useKeyboardControls } from './useKeyboardControls.js'
import CharacterModel from './CharacterModel.jsx'

const WALK_SPEED = 8
const RUN_SPEED = 18

// 맵별 시작 위치
const START_POSITIONS = {
  main: [-1.91, 0.04, 32.55],    // 메인 맵 시작 위치
  school: [-1.32, 2, -14.63],              // 학교 맵 시작 위치
}

// 3DCommunity 방식: scale 2 기준 캡슐 args=[2, 1.3], position=[0, 3.2, 0]
// VerseUp scale 0.8 기준으로 비례 조정 (ratio = 0.4)
const CAPSULE_HALF_HEIGHT = 0.8
const CAPSULE_RADIUS = 0.52
const CAPSULE_Y_OFFSET = 1.28

// 계단 오르기 설정
const STEP_UP_SPEED = 4 // 계단 오를 때 상승 속도 (중력 -20 기준)
const BLOCKED_THRESHOLD = 0.45 // 이 비율 이하로 움직이면 막힌 것으로 판단

const Player = forwardRef(({ currentMap = 'main', cameraAngle = 0, onPositionChange, bodyRef: externalBodyRef }, ref) => {
  const START_POS = START_POSITIONS[currentMap] || START_POSITIONS.main
  const bodyRef = useRef(null)
  const characterRef = useRef(null)
  const currentRotationRef = useRef(new THREE.Quaternion())
  const { forward, backward, left, right, shift } = useKeyboardControls()

  const [isMoving, setIsMoving] = useState(false)
  const lastMovingRef = useRef(false)

  useImperativeHandle(ref, () => characterRef.current)

  // 외부 bodyRef에도 연결
  useEffect(() => {
    if (externalBodyRef) {
      externalBodyRef.current = bodyRef.current
    }
  }, [externalBodyRef])

  useFrame(() => {
    const body = bodyRef.current
    if (!body) return

    // 카메라 기준 방향 벡터 (로컬 좌표계)
    const direction = new THREE.Vector3()
    if (forward) direction.z -= 1  // 카메라 앞
    if (backward) direction.z += 1 // 카메라 뒤
    if (left) direction.x -= 1     // 카메라 왼쪽
    if (right) direction.x += 1    // 카메라 오른쪽

    const wantsToMove = direction.lengthSq() > 0
    const speed = shift ? RUN_SPEED : WALK_SPEED
    const linvel = body.linvel()
    const pos = body.translation()

    if (wantsToMove) {
      direction.normalize()

      // 카메라 각도만큼 방향 벡터를 회전 (Y축 기준)
      const rotatedDirection = new THREE.Vector3()
      rotatedDirection.x = direction.x * Math.cos(cameraAngle) + direction.z * Math.sin(cameraAngle)
      rotatedDirection.z = direction.z * Math.cos(cameraAngle) - direction.x * Math.sin(cameraAngle)

      // 캐릭터가 이동 방향을 바라보도록 각도 계산
      const targetAngle = Math.atan2(rotatedDirection.x, rotatedDirection.z)
      const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle)
      currentRotationRef.current.slerp(targetQuaternion, 0.25)

      body.setRotation(
        {
          x: currentRotationRef.current.x,
          y: currentRotationRef.current.y,
          z: currentRotationRef.current.z,
          w: currentRotationRef.current.w,
        },
        true
      )

      // 계단 감지: 이동하려는데 실제 수평 속도가 낮으면 막힌 것
      const desiredHorizontalSpeed = speed
      const actualHorizontalSpeed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z)
      const isBlocked = actualHorizontalSpeed < desiredHorizontalSpeed * BLOCKED_THRESHOLD
      const isGrounded = Math.abs(linvel.y) < 2 // 거의 바닥에 있음

      // 막혀있고 바닥에 있으면 위로 밀어줌 (계단 오르기)
      let yVel = linvel.y
      if (isBlocked && isGrounded) {
        // 현재 Y속도가 목표보다 낮으면 올려줌
        yVel = Math.max(linvel.y, STEP_UP_SPEED)
      }

      // 속도 설정 (회전된 방향으로 이동)
      body.setLinvel(
        {
          x: rotatedDirection.x * speed,
          y: yVel,
          z: rotatedDirection.z * speed,
        },
        true
      )
    } else {
      body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true)
    }

    if (wantsToMove !== lastMovingRef.current) {
      lastMovingRef.current = wantsToMove
      setIsMoving(wantsToMove)
    }

    // RigidBody 회전이 자식에게 자동 상속되므로 수동 복사 불필요

    if (onPositionChange) {
      onPositionChange({ x: pos.x, y: pos.y, z: pos.z })
    }
  })

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      position={START_POS}
      enabledRotations={[false, true, false]}
      mass={1}
      linearDamping={0.5}
    >
      {/* 3DCommunity 방식: 캐릭터는 원점에, 캡슐은 캐릭터를 덮도록 위치 */}
      <CapsuleCollider
        args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]}
        position={[0, CAPSULE_Y_OFFSET, 0]}
        friction={1}
        restitution={0}
      />
      <group ref={characterRef}>
        <CharacterModel isMoving={isMoving} />
      </group>
    </RigidBody>
  )
})

Player.displayName = 'Player'

export default Player