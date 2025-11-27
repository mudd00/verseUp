import { Canvas } from '@react-three/fiber'
import { Sky, Environment } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useRef, useState, useCallback, useEffect } from 'react'
import MapModel from './MapModel.jsx'
import Player from './Player.jsx'
import ThirdPersonCamera from './ThirdPersonCamera.jsx'
import * as THREE from 'three'

export default function MetaverseScene({ onReady }) {
  const playerRef = useRef(null)
  const playerBodyRef = useRef(null)
  const [currentMap, setCurrentMap] = useState('main')
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0 })
  const [portalInfo, setPortalInfo] = useState({ isNear: false, targetMap: null, label: null })
  const [doorInfo, setDoorInfo] = useState({ isNear: false, doorId: null, label: null })
  const [resetTrigger, setResetTrigger] = useState(0)
  const [cameraAngle, setCameraAngle] = useState(0)

  const handlePositionChange = useCallback((position) => {
    setPlayerPosition(position)
  }, [])

  const handleCameraRotate = useCallback((angle) => {
    setCameraAngle(angle)
  }, [])

  const handleMapChange = useCallback((targetMap) => {
    setCurrentMap(targetMap)
    setResetTrigger((prev) => prev + 1) // 플레이어 위치 리셋 트리거
    setPortalInfo({ isNear: false, targetMap: null, label: null }) // 포탈 UI 숨기기
    setDoorInfo({ isNear: false, doorId: null, label: null }) // 문 UI 숨기기
  }, [])

  const handlePortalNearChange = useCallback((info) => {
    setPortalInfo(info)
  }, [])

  const handleDoorNearChange = useCallback((info) => {
    setDoorInfo(info)
  }, [])

  const handleDoorEnter = useCallback((doorId) => {
    if (!playerBodyRef.current) return

    // 입장(_enter)과 퇴장(_exit) 구분
    if (doorId.endsWith('_enter')) {
      // 문 안으로 들어가기
      const baseDoorId = doorId.replace('_enter', '')
      const enterDestinations = {
        door1: [-53.06, 1.5, -22],  // 교실 1 안쪽
        door2: [-69.25, 1.5, -22],  // 교실 2 안쪽
      }
      const destination = enterDestinations[baseDoorId]
      if (destination) {
        playerBodyRef.current.setTranslation({ x: destination[0], y: destination[1], z: destination[2] }, true)
        setDoorInfo({ isNear: false, doorId: null, label: null })
        console.log(`${baseDoorId} 입장 ->`, destination)
      }
    } else if (doorId.endsWith('_exit')) {
      // 문 밖으로 나가기
      const baseDoorId = doorId.replace('_exit', '')
      const exitDestinations = {
        door1: [-52.88, 1.5, -20],  // 교실 1 문 밖 (임시, 조정 필요)
        door2: [-67.69, 1.5, -20],  // 교실 2 문 밖 (임시, 조정 필요)
      }
      const destination = exitDestinations[baseDoorId]
      if (destination) {
        playerBodyRef.current.setTranslation({ x: destination[0], y: destination[1], z: destination[2] }, true)
        setDoorInfo({ isNear: false, doorId: null, label: null })
        console.log(`${baseDoorId} 퇴장 ->`, destination)
      }
    }
  }, [])

  // F키 상호작용 리스너
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'KeyF') {
        // 포탈 우선 처리
        if (portalInfo.isNear) {
          handleMapChange(portalInfo.targetMap)
        }
        // 문 처리
        else if (doorInfo.isNear) {
          handleDoorEnter(doorInfo.doorId)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [portalInfo, doorInfo, handleMapChange, handleDoorEnter])

  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [-0.0, 28.35, 19.76], fov: 60 }} shadows onCreated={() => onReady?.()}>
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[50, 50, 25]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />

        <Sky sunPosition={[100, 20, 100]} turbidity={8} rayleigh={2} />
        <Environment preset="sunset" />
        <fog attach="fog" args={['#87CEEB', 10, 100]} />

        <Physics gravity={[0, -20, 0]} key={resetTrigger}>
          <MapModel
            currentMap={currentMap}
            onMapChange={handleMapChange}
            onPortalNearChange={handlePortalNearChange}
            onDoorNearChange={handleDoorNearChange}
          />
          <Player
            ref={playerRef}
            bodyRef={playerBodyRef}
            currentMap={currentMap}
            cameraAngle={cameraAngle}
            onPositionChange={handlePositionChange}
          />
        </Physics>

        <ThirdPersonCamera target={playerRef} onCameraRotate={handleCameraRotate} />
      </Canvas>

      {/* 플레이어 위치 표시 */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#4ade80',
          padding: '10px 15px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <div style={{ color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>Player Position</div>
        <div>X: {playerPosition.x.toFixed(2)}</div>
        <div>Y: {playerPosition.y.toFixed(2)}</div>
        <div>Z: {playerPosition.z.toFixed(2)}</div>
      </div>

      {/* 포탈 상호작용 안내 */}
      {portalInfo.isNear && (
        <div
          style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '15px 30px',
            borderRadius: '12px',
            fontFamily: 'sans-serif',
            fontSize: '18px',
            zIndex: 9999,
            pointerEvents: 'none',
            textAlign: 'center',
            border: '2px solid #7c3aed',
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)',
          }}
        >
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#a78bfa' }}>
            {portalInfo.label}
          </div>
          <div style={{ fontSize: '14px', color: '#ccc' }}>
            <span style={{
              display: 'inline-block',
              background: '#7c3aed',
              padding: '2px 8px',
              borderRadius: '4px',
              marginRight: '8px',
              fontWeight: 'bold'
            }}>F</span>
            키를 눌러 이동
          </div>
        </div>
      )}

      {/* 문 상호작용 안내 */}
      {doorInfo.isNear && (
        <div
          style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '15px 30px',
            borderRadius: '12px',
            fontFamily: 'sans-serif',
            fontSize: '18px',
            zIndex: 9999,
            pointerEvents: 'none',
            textAlign: 'center',
            border: '2px solid #10b981',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
          }}
        >
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#6ee7b7' }}>
            {doorInfo.label}
          </div>
          <div style={{ fontSize: '14px', color: '#ccc' }}>
            <span style={{
              display: 'inline-block',
              background: '#10b981',
              padding: '2px 8px',
              borderRadius: '4px',
              marginRight: '8px',
              fontWeight: 'bold'
            }}>F</span>
            키를 눌러 입장
          </div>
        </div>
      )}
    </div>
  )
}
