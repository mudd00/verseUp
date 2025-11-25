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
  const [currentMap, setCurrentMap] = useState('main')
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0 })
  const [portalInfo, setPortalInfo] = useState({ isNear: false, targetMap: null, label: null })
  const [resetTrigger, setResetTrigger] = useState(0)

  const handlePositionChange = useCallback((position) => {
    setPlayerPosition(position)
  }, [])

  const handleMapChange = useCallback((targetMap) => {
    setCurrentMap(targetMap)
    setResetTrigger((prev) => prev + 1) // 플레이어 위치 리셋 트리거
    setPortalInfo({ isNear: false, targetMap: null, label: null }) // 포탈 UI 숨기기
  }, [])

  const handlePortalNearChange = useCallback((info) => {
    setPortalInfo(info)
  }, [])

  // F키 상호작용 리스너
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'KeyF' && portalInfo.isNear) {
        handleMapChange(portalInfo.targetMap)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [portalInfo, handleMapChange])

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
          />
          <Player ref={playerRef} onPositionChange={handlePositionChange} />
        </Physics>

        <ThirdPersonCamera target={playerRef} />
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
    </div>
  )
}
