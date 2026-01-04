import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody } from '@react-three/rapier'
import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { Text, Billboard } from '@react-three/drei'
import { useKeyboardControls } from './useKeyboardControls.js'
import CharacterModel from './CharacterModel.jsx'

const WALK_SPEED = 8
const RUN_SPEED = 18

// 맵별 설정 (시작 위치, 캐릭터 스케일, 콜라이더)
const MAP_SETTINGS = {
  main: {
    startPosition: [-1.91, 2, 32.55],
    characterScale: 0.8,
    capsuleHalfHeight: 0.8,
    capsuleRadius: 0.52,
    capsuleYOffset: 1.28,
  },
  school: {
    startPosition: [-1.32, 2, -14.63],
    characterScale: 0.8,
    capsuleHalfHeight: 0.8,
    capsuleRadius: 0.52,
    capsuleYOffset: 1.28,
  },
  anime: {
    startPosition: [0, 5, 0],
    characterScale: 0.5,           // 애니메 학교용 작은 캐릭터
    capsuleHalfHeight: 0.5,
    capsuleRadius: 0.32,
    capsuleYOffset: 0.8,
  },
}

// 기본값 (하위 호환)
const DEFAULT_SETTINGS = MAP_SETTINGS.main

// 계단 오르기 설정
const STEP_UP_SPEED = 4 // 계단 오를 때 상승 속도 (중력 -20 기준)
const BLOCKED_THRESHOLD = 0.45 // 이 비율 이하로 움직이면 막힌 것으로 판단

const Player = forwardRef(({ currentMap = 'main', cameraAngleRef, onPositionChange, bodyRef: externalBodyRef, isInputDisabled = false, isFirstPerson = false, userName = '', isInvisible = false }, ref) => {
  // 맵별 설정 가져오기
  const mapSettings = MAP_SETTINGS[currentMap] || DEFAULT_SETTINGS
  const START_POS = mapSettings.startPosition
  const CHARACTER_SCALE = mapSettings.characterScale
  const CAPSULE_HALF_HEIGHT = mapSettings.capsuleHalfHeight
  const CAPSULE_RADIUS = mapSettings.capsuleRadius
  const CAPSULE_Y_OFFSET = mapSettings.capsuleYOffset
  const bodyRef = useRef(null)
  const characterRef = useRef(null)
  const currentRotationRef = useRef(new THREE.Quaternion())
  const { forward, backward, left, right, shift } = useKeyboardControls(isInputDisabled)

  const [isMoving, setIsMoving] = useState(false)
  const [isSitting, setIsSitting] = useState(false)
  const lastMovingRef = useRef(false)
  const sittingPositionRef = useRef(null)
  const sittingRotationRef = useRef(null)

  useImperativeHandle(ref, () => {
    const character = characterRef.current
    if (!character) return null

    // Three.js Group 메서드들을 유지하면서 커스텀 메서드 추가
    return Object.assign(character, {
      sit: (position, type) => {
        if (!bodyRef.current) return
        setIsSitting(true)
        sittingPositionRef.current = position

        // type에 따라 바라보는 방향 설정
        let targetRotation
        if (type === 'sit') {
          // 의자: +X 방향 (오른쪽)
          targetRotation = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            Math.PI / 2  // 90도
          )
        } else if (type === 'stand') {
          // 교탁: -X 방향 (왼쪽)
          targetRotation = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            -Math.PI / 2  // -90도
          )
        } else {
          // 기본: 현재 회전 유지
          targetRotation = bodyRef.current.rotation()
        }

        sittingRotationRef.current = targetRotation
        currentRotationRef.current.copy(targetRotation)

        // RigidBody를 kinematic으로 변경 (물리 충돌 무시)
        bodyRef.current.setBodyType(1, true) // 1 = KinematicPositionBased
        // 앉는 위치로 텔레포트
        bodyRef.current.setTranslation({ x: position[0], y: position[1], z: position[2] }, true)
        bodyRef.current.setRotation(
          {
            x: targetRotation.x,
            y: targetRotation.y,
            z: targetRotation.z,
            w: targetRotation.w,
          },
          true
        )
        bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
        console.log(`💺 ${type === 'sit' ? '앉기' : '서기'} 활성화:`, position, '방향:', type === 'sit' ? '+X' : '-X')
      },
      stand: () => {
        if (!bodyRef.current) return

        // 의자 앞으로 이동 (끼지 않도록)
        const currentPos = bodyRef.current.translation()
        bodyRef.current.setTranslation(
          {
            x: currentPos.x,
            y: currentPos.y,
            z: currentPos.z + 0.8  // 앞으로 0.8 이동
          },
          true
        )

        // RigidBody를 다시 dynamic으로 변경
        bodyRef.current.setBodyType(0, true) // 0 = Dynamic
        setIsSitting(false)
        sittingPositionRef.current = null
        sittingRotationRef.current = null
        console.log('🚶 일어서기 - 의자 옆으로 이동')
      },
      isSitting: () => isSitting,
      isMoving: () => isMoving,
    })
  }, [isSitting, isMoving])

  // 외부 bodyRef에도 연결
  useEffect(() => {
    if (externalBodyRef) {
      externalBodyRef.current = bodyRef.current
    }
  }, [externalBodyRef])

  useFrame(() => {
    const body = bodyRef.current
    if (!body) return

    const linvel = body.linvel()
    const pos = body.translation()

    // 맵 밑으로 떨어졌을 때 자동 리스폰 (안전망 Y=-5 이전에 감지)
    if (pos.y < -3) {
      console.log('⚠️ 캐릭터가 맵 밖으로 떨어짐, 리스폰 중...')
      body.setTranslation({ x: START_POS[0], y: START_POS[1], z: START_POS[2] }, true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      return
    }

    // 앉아있을 때는 이동 불가, 위치 및 회전 고정
    if (isSitting && sittingPositionRef.current && sittingRotationRef.current) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true) // 각속도도 0으로
      body.setTranslation(
        {
          x: sittingPositionRef.current[0],
          y: sittingPositionRef.current[1],
          z: sittingPositionRef.current[2],
        },
        true
      )
      // 회전도 고정
      body.setRotation(
        {
          x: sittingRotationRef.current.x,
          y: sittingRotationRef.current.y,
          z: sittingRotationRef.current.z,
          w: sittingRotationRef.current.w,
        },
        true
      )
      setIsMoving(false)
      lastMovingRef.current = false

      if (onPositionChange) {
        onPositionChange({ x: pos.x, y: pos.y, z: pos.z })
      }
      return
    }

    // 카메라 기준 방향 벡터 (로컬 좌표계)
    const direction = new THREE.Vector3()
    if (forward) direction.z -= 1  // 카메라 앞
    if (backward) direction.z += 1 // 카메라 뒤
    if (left) direction.x -= 1     // 카메라 왼쪽
    if (right) direction.x += 1    // 카메라 오른쪽

    const wantsToMove = direction.lengthSq() > 0
    const speed = shift ? RUN_SPEED : WALK_SPEED

    if (wantsToMove) {
      direction.normalize()

      // 카메라 각도만큼 방향 벡터를 회전 (Y축 기준)
      const cameraAngle = cameraAngleRef?.current ?? 0
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
      body.setAngvel({ x: 0, y: 0, z: 0 }, true) // 각속도도 0으로 (회전 멈춤)
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
      {/* 참관자(부모)는 캐릭터를 렌더링하지 않음 */}
      <group ref={characterRef} visible={!isFirstPerson && !isInvisible}>
        <CharacterModel isMoving={isMoving} isSitting={isSitting} scale={CHARACTER_SCALE} />
        {/* 내 닉네임 표시 (항상 카메라를 바라봄) - 캐릭터 크기에 맞게 조정 */}
        {userName && !isInvisible && (
          <Billboard position={[0, 2.8 * CHARACTER_SCALE, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[1.8 * CHARACTER_SCALE, 0.4 * CHARACTER_SCALE]} />
              <meshBasicMaterial color="#1e293b" transparent opacity={0.85} />
            </mesh>
            <Text
              fontSize={0.2 * CHARACTER_SCALE}
              color="#4ade80"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              outlineWidth={0.02}
              outlineColor="#000000"
            >
              {userName}
            </Text>
          </Billboard>
        )}
      </group>
    </RigidBody>
  )
})

Player.displayName = 'Player'

export default Player