import { Canvas } from '@react-three/fiber'
import { Sky, Environment } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useRef, useState, useCallback, useEffect } from 'react'
import MapModel from './MapModel.jsx'
import Player from './Player.jsx'
import ThirdPersonCamera from './ThirdPersonCamera.jsx'
import Screen from './Screen.jsx'
import * as THREE from 'three'

export default function MetaverseScene({ onReady }) {
  const playerRef = useRef(null)
  const playerBodyRef = useRef(null)
  const [currentMap, setCurrentMap] = useState('main')
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0 })
  const [portalInfo, setPortalInfo] = useState({ isNear: false, targetMap: null, label: null })
  const [doorInfo, setDoorInfo] = useState({ isNear: false, doorId: null, label: null })
  const [objectInfo, setObjectInfo] = useState({ isNear: false, objectId: null, label: null, type: null, position: null })
  const [resetTrigger, setResetTrigger] = useState(0)
  const [cameraAngle, setCameraAngle] = useState(0)
  const [isSitting, setIsSitting] = useState(false)
  const [isAtDesk, setIsAtDesk] = useState(false) // 교탁에 서 있는지
  const [screenStream, setScreenStream] = useState(null) // 화면 공유 스트림
  const [screenPosition, setScreenPosition] = useState(null) // 스크린 위치

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

  const handleScreenShare = useCallback(async () => {
    if (screenStream) {
      // 화면 공유 종료
      screenStream.getTracks().forEach(track => track.stop())
      setScreenStream(null)
      console.log('📺 화면 공유 종료')
    } else {
      // 화면 공유 시작
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: false
        })
        setScreenStream(stream)
        console.log('📺 화면 공유 시작')

        // 화면 공유가 중단되면 (사용자가 브라우저에서 중지)
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null)
          console.log('📺 화면 공유 중단됨')
        }
      } catch (err) {
        console.error('화면 공유 실패:', err)
        alert('화면 공유를 시작할 수 없습니다.')
      }
    }
  }, [screenStream])

  const handlePortalNearChange = useCallback((info) => {
    setPortalInfo(info)
  }, [])

  const handleDoorNearChange = useCallback((info) => {
    setDoorInfo(info)
  }, [])

  const handleObjectNearChange = useCallback((info) => {
    setObjectInfo(info)
  }, [])

  const handleScreenPositionChange = useCallback((position) => {
    setScreenPosition(position)
    console.log('📺 스크린 위치 업데이트:', position)
  }, [])

  const handleObjectInteract = useCallback((objectId, type, position) => {
    if (!playerRef.current) return

    console.log(`상호작용:`, objectId, type, position)

    if (type === 'sit') {
      console.log('💺 의자에 앉기')
      playerRef.current.sit(position, 'sit')
      setIsSitting(true)
      setIsAtDesk(false)
    } else if (type === 'stand') {
      console.log('🎓 교탁에 서기')
      playerRef.current.sit(position, 'stand')
      setIsSitting(true)
      setIsAtDesk(true) // 교탁에 섬
    }

    setObjectInfo({ isNear: false, objectId: null, label: null, type: null, position: null })
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
        // 앉아있을 때는 일어서기
        if (isSitting && playerRef.current) {
          playerRef.current.stand()
          setIsSitting(false)
          setIsAtDesk(false)
          // 화면 공유 중이었다면 종료
          if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop())
            setScreenStream(null)
          }
          console.log('일어서기 완료')
          return
        }

        // 포탈 우선 처리
        if (portalInfo.isNear) {
          handleMapChange(portalInfo.targetMap)
        }
        // 문 처리
        else if (doorInfo.isNear) {
          handleDoorEnter(doorInfo.doorId)
        }
        // 상호작용 객체 처리 (의자, 교탁 등)
        else if (objectInfo.isNear) {
          handleObjectInteract(objectInfo.objectId, objectInfo.type, objectInfo.position)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [portalInfo, doorInfo, objectInfo, isSitting, handleMapChange, handleDoorEnter, handleObjectInteract])

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
            onObjectNearChange={handleObjectNearChange}
            onScreenPositionChange={handleScreenPositionChange}
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

        {/* 학교 맵에서만 스크린 표시 */}
        {currentMap === 'school' && screenPosition && (
          <Screen
            position={screenPosition}
            size={[8, 4.5]}
            videoStream={screenStream}
          />
        )}
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

      {/* 상호작용 객체 안내 (의자, 교탁 등) */}
      {objectInfo.isNear && !isSitting && (
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
            border: `2px solid ${objectInfo.type === 'sit' ? '#f59e0b' : '#3b82f6'}`,
            boxShadow: `0 0 20px ${objectInfo.type === 'sit' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(59, 130, 246, 0.5)'}`,
          }}
        >
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: objectInfo.type === 'sit' ? '#fbbf24' : '#60a5fa' }}>
            {objectInfo.label}
          </div>
          <div style={{ fontSize: '14px', color: '#ccc' }}>
            <span style={{
              display: 'inline-block',
              background: objectInfo.type === 'sit' ? '#f59e0b' : '#3b82f6',
              padding: '2px 8px',
              borderRadius: '4px',
              marginRight: '8px',
              fontWeight: 'bold'
            }}>F</span>
            키를 눌러 상호작용
          </div>
        </div>
      )}

      {/* 앉아있을 때 일어서기 안내 */}
      {isSitting && (
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
            border: '2px solid #ef4444',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
          }}
        >
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#fca5a5' }}>
            앉아있는 상태
          </div>
          <div style={{ fontSize: '14px', color: '#ccc' }}>
            <span style={{
              display: 'inline-block',
              background: '#ef4444',
              padding: '2px 8px',
              borderRadius: '4px',
              marginRight: '8px',
              fontWeight: 'bold'
            }}>F</span>
            키를 눌러 일어서기
          </div>
        </div>
      )}

      {/* 교탁에 섰을 때 화면 공유 버튼 */}
      {isAtDesk && (
        <button
          onClick={handleScreenShare}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: screenStream ? '#ef4444' : '#3b82f6',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 9999,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)'
          }}
        >
          {screenStream ? '📺 화면 공유 종료' : '📺 화면 공유 시작'}
        </button>
      )}
    </div>
  )
}
