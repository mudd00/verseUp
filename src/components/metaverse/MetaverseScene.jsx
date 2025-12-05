import { Canvas } from '@react-three/fiber'
import { Sky, Environment } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import MapModel from './MapModel.jsx'
import Player from './Player.jsx'
import ThirdPersonCamera from './ThirdPersonCamera.jsx'
import ScreenShareOverlay from './ScreenShareOverlay.jsx'
import { useScreenShare } from '../../hooks/useScreenShare'
import { useScreenReceive } from '../../hooks/useScreenReceive'
import { useAuthStore } from '../../stores/authStore'
import { socketService } from '../../services/socket'
import * as THREE from 'three'

export default function MetaverseScene({ onReady }) {
  const playerRef = useRef(null)
  const playerBodyRef = useRef(null)
  const user = useAuthStore((state) => state.user)
  const [currentMap, setCurrentMap] = useState('main')
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0 })
  const [portalInfo, setPortalInfo] = useState({ isNear: false, targetMap: null, label: null })
  const [doorInfo, setDoorInfo] = useState({ isNear: false, doorId: null, label: null })
  const [objectInfo, setObjectInfo] = useState({ isNear: false, objectId: null, label: null, type: null, position: null })
  const [resetTrigger, setResetTrigger] = useState(0)
  const [cameraAngle, setCameraAngle] = useState(0)
  const [isSitting, setIsSitting] = useState(false)
  const [isAtDesk, setIsAtDesk] = useState(false) // 교탁에 서 있는지
  const [roomId] = useState('metaverse-classroom-1') // 임시 방 ID
  const [students, setStudents] = useState([]) // 방의 학생 목록
  const [isViewingScreen, setIsViewingScreen] = useState(false) // 학생이 화면을 보고 있는지

  // 사용자 역할 확인 (테스트용 URL 파라미터 지원)
  const urlParams = new URLSearchParams(window.location.search)
  const testRole = urlParams.get('role') // ?role=instructor 또는 ?role=student

  // 테스트용 임시 사용자 생성 (useMemo로 안정화 - 매 렌더마다 새로 생성되지 않도록)
  const effectiveUser = useMemo(() => {
    if (user) return user
    if (testRole) {
      return {
        id: `test-${testRole}-${Date.now()}`,
        name: testRole === 'instructor' ? '테스트 강사' : '테스트 학생',
        email: `test-${testRole}@test.com`,
        role: testRole,
      }
    }
    return null
  }, [user, testRole])

  const isInstructor = testRole === 'instructor' || effectiveUser?.role === 'instructor' || effectiveUser?.email?.startsWith('instructor@')

  // WebRTC 훅 사용 (역할에 따라 활성화 여부 전달)
  const screenShare = useScreenShare(roomId, students, isInstructor)
  const screenReceive = useScreenReceive(roomId, !isInstructor)

  // 강사가 화면 공유를 중지하면 학생의 뷰 상태 리셋
  useEffect(() => {
    if (!isInstructor && !screenReceive?.teacherInfo) {
      setIsViewingScreen(false)
    }
  }, [isInstructor, screenReceive?.teacherInfo])

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

  // Socket 연결 초기화
  useEffect(() => {
    // 토큰이 없어도 연결 시도 (테스트 모드용)
    socketService.connect(null)
    console.log('🔌 Initializing socket connection...')

    return () => {
      // 컴포넌트 언마운트 시 연결 해제는 하지 않음 (다른 곳에서도 사용 가능)
    }
  }, [])

  // Socket.IO 방 참가 및 사용자 목록 관리
  useEffect(() => {
    if (effectiveUser && currentMap === 'school') {
      console.log('🚪 Joining room:', roomId, 'as', effectiveUser.name)

      // 사용자 정보와 함께 소켓 연결
      socketService.emit('user:join', { user: effectiveUser })

      // 방 참가
      socketService.emit('room:join', { roomId })

      // 방 사용자 목록 수신
      const handleRoomUsers = ({ users }) => {
        setStudents(users.filter(u => u.user?.id !== effectiveUser.id)) // 본인 제외
        console.log('📚 Room users:', users.length, 'total -', users.map(u => u.user?.name))
      }

      // 새 사용자 입장
      const handleUserJoined = ({ user: newUser, socketId }) => {
        if (newUser.id !== effectiveUser.id) {
          setStudents(prev => [...prev, { user: newUser, socketId }])
          console.log('👋 User joined:', newUser.name)
        }
      }

      // 사용자 퇴장
      const handleUserLeft = ({ socketId }) => {
        setStudents(prev => prev.filter(s => s.socketId !== socketId))
        console.log('👋 User left:', socketId)
      }

      socketService.on('room:users', handleRoomUsers)
      socketService.on('room:user-joined', handleUserJoined)
      socketService.on('room:user-left', handleUserLeft)

      return () => {
        socketService.off('room:users', handleRoomUsers)
        socketService.off('room:user-joined', handleUserJoined)
        socketService.off('room:user-left', handleUserLeft)
        socketService.emit('room:leave', { roomId })
      }
    }
  }, [effectiveUser, currentMap, roomId])

  // 화면 공유 토글 (강사용)
  const handleScreenShareToggle = useCallback(() => {
    console.log('🎬 handleScreenShareToggle called', {
      hasScreenShare: !!screenShare,
      isSharing: screenShare?.isSharing,
      studentsCount: students.length,
      students: students.map(s => s.user?.name),
    })

    if (!screenShare) {
      console.error('❌ screenShare is null!')
      return
    }

    if (screenShare.isSharing) {
      console.log('⏹️ Stopping screen share...')
      screenShare.stopSharing()
    } else {
      console.log('▶️ Starting screen share...')
      screenShare.startSharing()
    }
  }, [screenShare, students])

  const handlePortalNearChange = useCallback((info) => {
    setPortalInfo(info)
  }, [])

  const handleDoorNearChange = useCallback((info) => {
    setDoorInfo(info)
  }, [])

  const handleObjectNearChange = useCallback((info) => {
    setObjectInfo(info)
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
          // 강사가 화면 공유 중이었다면 종료
          if (isInstructor && screenShare?.isSharing) {
            screenShare.stopSharing()
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
  }, [portalInfo, doorInfo, objectInfo, isSitting, isInstructor, screenShare, handleMapChange, handleDoorEnter, handleObjectInteract])

  return (
    <div className="w-full h-screen">
      {/* 애니메이션을 위한 스타일 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

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

      {/* 학생용: 공유 화면 보기 버튼 */}
      {!isInstructor && screenReceive?.teacherInfo && !isViewingScreen && (
        <button
          onClick={() => setIsViewingScreen(true)}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#10b981',
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)'
          }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            background: '#ef4444',
            borderRadius: '50%',
            animation: 'pulse 2s infinite',
          }}></div>
          📺 {screenReceive.teacherInfo?.teacherName || '강사'}님의 화면 보기
        </button>
      )}

      {/* 학생용: 화면 공유 수신 오버레이 */}
      {!isInstructor && screenReceive?.teacherStream && isViewingScreen && (
        <ScreenShareOverlay
          stream={screenReceive.teacherStream}
          teacherName={screenReceive.teacherInfo?.teacherName || '강사'}
          onClose={() => setIsViewingScreen(false)}
        />
      )}

      {/* 플레이어 위치 및 상태 표시 */}
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
        <div style={{ color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>Debug Info</div>
        <div>X: {playerPosition.x.toFixed(2)}</div>
        <div>Y: {playerPosition.y.toFixed(2)}</div>
        <div>Z: {playerPosition.z.toFixed(2)}</div>

        {effectiveUser && (
          <div style={{ color: '#60a5fa', marginTop: '8px', borderTop: '1px solid #374151', paddingTop: '8px' }}>
            <div style={{ fontWeight: 'bold' }}>{effectiveUser.name}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{effectiveUser.role}</div>
          </div>
        )}

        {testRole && (
          <div style={{ color: '#fbbf24', marginTop: '4px', fontSize: '12px', fontWeight: 'bold' }}>
            🧪 TEST MODE
          </div>
        )}

        <div style={{ marginTop: '8px', borderTop: '1px solid #374151', paddingTop: '8px' }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>Status:</div>
          <div style={{ fontSize: '12px' }}>
            <div>Map: {currentMap}</div>
            <div>Sitting: {isSitting ? '✅' : '❌'}</div>
            <div>At Desk: {isAtDesk ? '✅' : '❌'}</div>
            {isInstructor && (
              <div style={{ color: screenShare?.isSharing ? '#10b981' : '#ef4444' }}>
                Sharing: {screenShare?.isSharing ? '✅' : '❌'}
              </div>
            )}
            {!isInstructor && (
              <>
                <div style={{ color: screenReceive?.teacherInfo ? '#10b981' : '#ef4444' }}>
                  Teacher Sharing: {screenReceive?.teacherInfo ? '✅' : '❌'}
                </div>
                <div style={{ color: screenReceive?.teacherStream ? '#10b981' : '#ef4444' }}>
                  Stream Received: {screenReceive?.teacherStream ? '✅' : '❌'}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: '8px', borderTop: '1px solid #374151', paddingTop: '8px' }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>
            Room Users ({students.length + 1}):
          </div>
          <div style={{ fontSize: '11px', maxHeight: '100px', overflowY: 'auto' }}>
            <div style={{ color: '#10b981' }}>• {effectiveUser?.name} (me)</div>
            {students.map((student, idx) => (
              <div key={idx} style={{ color: '#60a5fa' }}>
                • {student.user?.name || 'Unknown'}
              </div>
            ))}
          </div>
        </div>
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

      {/* 교탁에 섰을 때 화면 공유 버튼 (강사만) */}
      {isAtDesk && isInstructor && screenShare && (
        <button
          onClick={handleScreenShareToggle}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: screenShare.isSharing ? '#ef4444' : '#3b82f6',
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
          {screenShare.isSharing ? '📺 화면 공유 종료' : '📺 화면 공유 시작'}
        </button>
      )}

      {/* 에러 표시 (강사용) */}
      {isInstructor && screenShare?.error && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            right: '20px',
            background: '#ef4444',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: 9999,
            maxWidth: '300px',
          }}
        >
          {screenShare.error}
        </div>
      )}
    </div>
  )
}
