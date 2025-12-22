import { Canvas } from '@react-three/fiber'
import { Sky, Environment } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import MapModel from './MapModel.jsx'
import Player from './Player.jsx'
import OtherPlayer from './OtherPlayer.jsx'
import ThirdPersonCamera from './ThirdPersonCamera.jsx'
import ScreenShareOverlay from './ScreenShareOverlay.jsx'
import ChatBox from './ChatBox.jsx'
import MetaverseUI from './MetaverseUI.jsx'
import { useScreenShare } from '../../hooks/useScreenShare'
import { useScreenReceive } from '../../hooks/useScreenReceive'
import { useStudentScreen } from '../../hooks/useStudentScreen'
import { useVoiceChat } from '../../hooks/useVoiceChat'
import { useChat } from '../../hooks/useChat'
import { useAuthStore } from '../../stores/authStore'
import { socketService } from '../../services/socket'
import api from '../../services/api'
import DeskMonitor from './DeskMonitor.jsx'
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
  const [sittingPosition, setSittingPosition] = useState(null) // 앉았을 때의 의자 위치
  const [isAtDesk, setIsAtDesk] = useState(false) // 교탁에 서 있는지
  const [roomId] = useState('metaverse-classroom-1') // 임시 방 ID
  const [students, setStudents] = useState([]) // 방의 학생 목록
  const [isViewingScreen, setIsViewingScreen] = useState(false) // 학생이 화면을 보고 있는지
  const [otherPlayers, setOtherPlayers] = useState(new Map()) // 다른 플레이어들 (socketId -> player data)
  const [isMenuOpen, setIsMenuOpen] = useState(false) // 메타버스 UI 메뉴 열림/닫힘
  const [showDebugInfo, setShowDebugInfo] = useState(true) // Debug info 표시 여부
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false) // 판서 활성화 여부
  const [isFirstPerson, setIsFirstPerson] = useState(false) // 1인칭/3인칭 시야 전환
  const [classroomAId, setClassroomAId] = useState(null) // 강의실 A의 ID
  const [currentClassroom, setCurrentClassroom] = useState(null) // 현재 위치한 교실 (예: 'A', 'B', null)
  const lastPositionSentRef = useRef({ x: 0, y: 0, z: 0 })
  const positionSendIntervalRef = useRef(null)

  // 사용자 역할 확인 (개발 환경에서만 테스트용 URL 파라미터 지원)
  const urlParams = new URLSearchParams(window.location.search)
  // 프로덕션에서는 테스트 역할 비활성화 (보안)
  const testRole = import.meta.env.DEV ? urlParams.get('role') : null // ?role=instructor 또는 ?role=student

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

  // 학생용 화면 캡처 (버튼으로 수동 제어)
  const studentScreen = useStudentScreen(!isInstructor)

  // 음성 채팅 훅 (모든 맵에서 활성화)
  const voiceChat = useVoiceChat(roomId, students, true)

  // 텍스트 채팅 훅 (모든 맵에서 활성화)
  const chat = useChat(roomId, true)

  // 디버깅: voiceChat 상태 모니터링
  useEffect(() => {
    console.log('🎤 [VoiceChat Debug]', {
      isMicOn: voiceChat.isMicOn,
      connections: voiceChat.connections.size,
      students: students.length,
      studentNames: students.map(s => s.user?.name),
      isInstructor,
      currentMap,
    })
  }, [voiceChat.isMicOn, voiceChat.connections.size, students.length, isInstructor, currentMap])

  // 디버깅: screenReceive 값 변경 모니터링
  useEffect(() => {
    console.log('[MetaverseScene] screenReceive updated:', {
      hasTeacherInfo: !!screenReceive?.teacherInfo,
      teacherInfo: screenReceive?.teacherInfo,
      hasTeacherStream: !!screenReceive?.teacherStream,
      isReceiving: screenReceive?.isReceiving
    })
  }, [screenReceive?.teacherInfo, screenReceive?.teacherStream, screenReceive?.isReceiving])

  // 강사가 화면 공유를 중지하면 학생의 뷰 상태 리셋
  useEffect(() => {
    if (!isInstructor && !screenReceive?.teacherInfo) {
      setIsViewingScreen(false)
    }
  }, [isInstructor, screenReceive?.teacherInfo])

  const handlePositionChange = useCallback((position) => {
    setPlayerPosition(position)

    // 위치가 일정 거리 이상 변했을 때만 전송 (최적화)
    const distance = Math.sqrt(
      Math.pow(position.x - lastPositionSentRef.current.x, 2) +
      Math.pow(position.y - lastPositionSentRef.current.y, 2) +
      Math.pow(position.z - lastPositionSentRef.current.z, 2)
    )

    if (distance > 0.1 && effectiveUser) {
      lastPositionSentRef.current = position

      const body = playerBodyRef.current
      const rotation = body ? body.rotation() : { y: 0 }
      const rotationY = Math.atan2(2 * (rotation.w * rotation.y + rotation.x * rotation.z), 1 - 2 * (rotation.y * rotation.y + rotation.z * rotation.z))

      socketService.emit('player:move', {
        roomId,
        position: [position.x, position.y, position.z],
        rotation: rotationY,
        animation: playerRef.current?.isMoving?.() ? 'walk' : 'idle',
      })
    }
  }, [currentMap, effectiveUser, roomId])

  const handleCameraRotate = useCallback((angle) => {
    setCameraAngle(angle)
  }, [])

  const handleMapChange = useCallback((targetMap) => {
    setCurrentMap(targetMap)
    setResetTrigger((prev) => prev + 1) // 플레이어 위치 리셋 트리거
    setPortalInfo({ isNear: false, targetMap: null, label: null }) // 포탈 UI 숨기기
    setDoorInfo({ isNear: false, doorId: null, label: null }) // 문 UI 숨기기

    // 위치 변경 알림 (학교/강의실)
    const location = targetMap === 'classroom' ? 'classroom' : 'school'
    socketService.emit('location:change', { roomId, location })
    console.log(`📍 [Location] Changed to ${location}`)
  }, [roomId])

  // 교실 목록 조회 및 "강의실 A" ID 찾기
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const response = await api.get('/classrooms')
        console.log('📚 [Classroom] API 응답:', response)
        const classrooms = response.classrooms || []
        console.log('📚 [Classroom] 교실 목록:', classrooms)

        // "강의실 A" 또는 첫 번째 교실 사용
        let classroomA = classrooms.find((c) => c.name === '강의실 A')

        if (!classroomA && classrooms.length > 0) {
          // "강의실 A"를 못 찾으면 첫 번째 교실 사용
          classroomA = classrooms[0]
          console.warn('⚠️ [Classroom] "강의실 A"를 찾지 못해 첫 번째 교실 사용:', classroomA.name)
        }

        if (classroomA) {
          setClassroomAId(classroomA.id)
          console.log('✅ [Classroom] 사용할 교실:', classroomA.name, 'ID:', classroomA.id)
        } else {
          console.error('❌ [Classroom] 사용 가능한 교실이 없습니다.')
        }
      } catch (error) {
        console.error('❌ [Classroom] 교실 목록 조회 실패:', error)
      }
    }

    fetchClassrooms()
  }, [])

  // Socket 연결 초기화
  useEffect(() => {
    console.log('🔌 [MetaverseScene] Initializing socket connection...')
    const socket = socketService.connect(null)
    console.log('🔌 [MetaverseScene] Socket instance:', socket)
    console.log('🔌 [MetaverseScene] Socket connected:', socket?.connected)

    // 연결 상태 확인
    const checkConnection = setInterval(() => {
      const currentSocket = socketService.getSocket()
      if (currentSocket?.connected) {
        console.log('✅ [MetaverseScene] Socket is now connected:', currentSocket.id)
        clearInterval(checkConnection)
      } else {
        console.warn('⏳ [MetaverseScene] Socket still not connected, retrying...')
      }
    }, 1000)

    // 5초 후 타임아웃
    setTimeout(() => {
      clearInterval(checkConnection)
      const currentSocket = socketService.getSocket()
      if (!currentSocket?.connected) {
        console.error('❌ [MetaverseScene] Socket connection timeout')
      }
    }, 5000)

    return () => {
      clearInterval(checkConnection)
      // 컴포넌트 언마운트 시 연결 해제는 하지 않음 (다른 곳에서도 사용 가능)
    }
  }, [])

  // 다른 플레이어 위치 업데이트 수신 (모든 맵에서)
  useEffect(() => {
    const handlePlayerMoved = ({ socketId, userId, user, position, rotation, animation }) => {
      setOtherPlayers(prev => {
        const newMap = new Map(prev)
        newMap.set(socketId, { socketId, userId, user, position, rotation, animation })
        return newMap
      })
    }

    socketService.on('player:moved', handlePlayerMoved)
    console.log('👥 [Multiplayer] Listening for player:moved events')

    return () => {
      socketService.off('player:moved', handlePlayerMoved)
      console.log('👥 [Multiplayer] Stopped listening for player:moved')
    }
  }, [])

  // Socket.IO 방 참가 및 사용자 목록 관리
  useEffect(() => {
    console.log('🔍 [Room Join Effect] Checking conditions:', {
      hasEffectiveUser: !!effectiveUser,
      effectiveUser,
      currentMap,
      roomId,
      socketConnected: socketService.getSocket()?.connected
    })

    if (!effectiveUser) return

    let isMounted = true

    // 방 사용자 목록 수신 (초기 접속 시 기존 유저들의 위치 포함)
    const handleRoomUsers = ({ users }) => {
      console.log('📚 [Room Join] Received room:users event:', users)
      const otherUsers = users.filter(u => u.user?.id !== effectiveUser.id)
      setStudents(otherUsers) // 본인 제외

      // 다른 플레이어들의 위치 정보로 otherPlayers 초기화
      setOtherPlayers(prev => {
        const newMap = new Map(prev)
        otherUsers.forEach(u => {
          if (u.socketId) {
            newMap.set(u.socketId, {
              socketId: u.socketId,
              userId: u.user?.id,
              user: u.user,
              position: u.position || [0, 2, 0],
              rotation: u.rotation || 0,
              animation: u.animation || 'idle',
            })
          }
        })
        return newMap
      })

      console.log('📚 [Room Join] Room users:', users.length, 'total -', users.map(u => u.user?.name))
      console.log('📚 [Room Join] Initialized otherPlayers with positions:', otherUsers.length)
    }

    // user:joined 응답을 받은 후 room:join 실행
    const handleUserJoinedConfirmation = ({ success }) => {
      if (success && isMounted) {
        console.log('✅ [Room Join] user:join confirmed, now joining room')
        socketService.emit('room:join', { roomId })
        console.log('📤 [Room Join] Emitted room:join')

        // 학교 입장 알림 (초기 입장)
        socketService.emit('location:change', { roomId, location: 'school' })
        console.log('📍 [Location] Initial entry to school')
      }
    }

    // 새 사용자 입장 (위치 정보 포함)
    const handleUserJoined = ({ user: newUser, socketId, position, rotation, animation }) => {
      console.log('👋 [Room Join] Received room:user-joined:', newUser.name, socketId, { position, rotation, animation })
      if (newUser.id !== effectiveUser.id) {
        setStudents(prev => [...prev, { user: newUser, socketId }])

        // 새 플레이어를 otherPlayers에 추가 (위치 정보 포함)
        setOtherPlayers(prev => {
          const newMap = new Map(prev)
          newMap.set(socketId, {
            socketId,
            userId: newUser.id,
            user: newUser,
            position: position || [0, 2, 0],
            rotation: rotation || 0,
            animation: animation || 'idle',
          })
          return newMap
        })

        console.log('👋 [Room Join] User added to students and otherPlayers:', newUser.name)
      }
    }

    // 사용자 퇴장
    const handleUserLeft = ({ socketId }) => {
      console.log('👋 [Room Join] Received room:user-left:', socketId)
      setStudents(prev => prev.filter(s => s.socketId !== socketId))
      setOtherPlayers(prev => {
        const newMap = new Map(prev)
        newMap.delete(socketId)
        return newMap
      })
      console.log('👋 [Room Join] User removed from students and otherPlayers')
    }

    // 이벤트 핸들러 등록
    console.log('📌 [Room Join] Registering room event handlers')
    socketService.on('user:joined', handleUserJoinedConfirmation)
    socketService.on('room:users', handleRoomUsers)
    socketService.on('room:user-joined', handleUserJoined)
    socketService.on('room:user-left', handleUserLeft)
    console.log('✅ [Room Join] Room event handlers registered')

    // Socket 연결 후 user:join 실행
    const joinRoom = async () => {
      try {
        console.log('⏳ [Room Join] Waiting for socket connection...')
        await socketService.waitForConnection()

        if (!isMounted) return

        console.log('✅ [Room Join] Socket connected, joining as:', effectiveUser.name)
        socketService.emit('user:join', { user: effectiveUser })
        console.log('📤 [Room Join] Emitted user:join')
      } catch (error) {
        console.error('❌ [Room Join] Failed to join room:', error)
      }
    }

    joinRoom()

    return () => {
      isMounted = false
      socketService.off('user:joined', handleUserJoinedConfirmation)
      socketService.off('room:users', handleRoomUsers)
      socketService.off('room:user-joined', handleUserJoined)
      socketService.off('room:user-left', handleUserLeft)
      socketService.emit('room:leave', { roomId })
      console.log('🚪 [Room Join] Cleanup: left room and removed handlers')
    }
  }, [effectiveUser, roomId])

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

  // 판서 시작/중지
  const handleWhiteboardToggle = useCallback(async () => {
    try {
      // Socket 연결 확인
      await socketService.waitForConnection()

      if (isWhiteboardActive) {
        console.log('🎨 Stopping whiteboard...')
        socketService.emit('whiteboard:stop', { roomId })
        setIsWhiteboardActive(false)
      } else {
        console.log('🎨 Starting whiteboard...')
        socketService.emit('whiteboard:start', { roomId })
        setIsWhiteboardActive(true)
      }
    } catch (error) {
      console.error('🎨 Failed to toggle whiteboard:', error)
      alert('소켓 연결 실패. 페이지를 새로고침해주세요.')
    }
  }, [isWhiteboardActive, roomId])

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
      setSittingPosition(position) // 앉은 위치 저장
      setIsAtDesk(false)
    } else if (type === 'stand') {
      console.log('🎓 교탁에 서기')
      playerRef.current.sit(position, 'stand')
      setIsSitting(true)
      setSittingPosition(null) // 교탁은 책상 모니터 필요 없음
      setIsAtDesk(true) // 교탁에 섬
    }

    setObjectInfo({ isNear: false, objectId: null, label: null, type: null, position: null })
  }, [])

  const handleDoorEnter = useCallback(async (doorId) => {
    if (!playerBodyRef.current) return

    console.log('🚪 [Door] F키 눌림, doorId:', doorId)

    // 입장(_enter)과 퇴장(_exit) 구분
    if (doorId.endsWith('_enter')) {
      const baseDoorId = doorId.replace('_enter', '')

      // 강의실 A (door1)만 접근 권한 확인
      if (baseDoorId === 'door1') {
        console.log('🔐 [Classroom A] 접근 권한 확인 시작')

        if (!classroomAId) {
          console.warn('⚠️ [Classroom A] classroomAId가 없음')
          alert('교실 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
          setDoorInfo({ isNear: false, doorId: null, label: null })
          return
        }

        if (!effectiveUser) {
          console.warn('⚠️ [Classroom A] effectiveUser가 없음 (로그인 필요)')
          alert('로그인이 필요합니다.')
          setDoorInfo({ isNear: false, doorId: null, label: null })
          return
        }

        try {
          console.log('📡 [Classroom A] API 호출:', `/classrooms/${classroomAId}/check-access`)
          // 접근 권한 확인 API 호출
          const response = await api.get(`/classrooms/${classroomAId}/check-access`)
          console.log('📡 [Classroom A] API 응답:', response)

          const { hasAccess, reason, message } = response

          if (!hasAccess) {
            console.warn('❌ [Classroom A] 접근 거부:', reason, message)
            alert(message || '교실에 접근할 수 없습니다.')
            setDoorInfo({ isNear: false, doorId: null, label: null })
            return
          }

          console.log('✅ [Classroom A] 접근 허용:', reason)
        } catch (error) {
          console.error('❌ [Classroom A] 접근 권한 확인 실패:', error)
          if (error.response?.status === 401) {
            alert('로그인이 필요합니다.')
          } else if (error.response?.status === 404) {
            alert('교실을 찾을 수 없습니다.')
          } else {
            alert('교실 접근 권한 확인 중 오류가 발생했습니다.')
          }
          setDoorInfo({ isNear: false, doorId: null, label: null })
          return
        }
      }

      // 문 안으로 들어가기 (권한 확인 통과 또는 door2)
      const enterDestinations = {
        door1: [-53.06, 1.5, -22],  // 강의실 A 안쪽
        door2: [-69.25, 1.5, -22],  // 교실 2 안쪽
      }
      const destination = enterDestinations[baseDoorId]
      if (destination) {
        playerBodyRef.current.setTranslation({ x: destination[0], y: destination[1], z: destination[2] }, true)
        setDoorInfo({ isNear: false, doorId: null, label: null })

        // 현재 교실 상태 업데이트 및 URL 업데이트
        const classroomName = baseDoorId === 'door1' ? 'A' : 'B'
        setCurrentClassroom(classroomName)
        const newUrl = new URL(window.location)
        newUrl.searchParams.set('classroom', classroomName)
        window.history.replaceState({}, '', newUrl)

        console.log(`✅ [Door] ${baseDoorId} (강의실 ${classroomName}) 입장 완료 ->`, destination)
      }
    } else if (doorId.endsWith('_exit')) {
      // 문 밖으로 나가기 (퇴장은 항상 허용)
      const baseDoorId = doorId.replace('_exit', '')
      const exitDestinations = {
        door1: [-52.88, 1.5, -20],  // 강의실 A 문 밖
        door2: [-67.69, 1.5, -20],  // 교실 2 문 밖
      }
      const destination = exitDestinations[baseDoorId]
      if (destination) {
        playerBodyRef.current.setTranslation({ x: destination[0], y: destination[1], z: destination[2] }, true)
        setDoorInfo({ isNear: false, doorId: null, label: null })

        // 교실 밖으로 나오면 currentClassroom 초기화 및 URL 업데이트
        setCurrentClassroom(null)
        const newUrl = new URL(window.location)
        newUrl.searchParams.delete('classroom')
        window.history.replaceState({}, '', newUrl)

        console.log(`✅ [Door] ${baseDoorId} 퇴장 완료 ->`, destination)
      }
    }
  }, [classroomAId, effectiveUser])

  // F키 상호작용 리스너
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 채팅 입력 중이면 무시
      if (chat.isInputActive) return

      if (e.code === 'KeyF') {
        // 앉아있을 때는 일어서기
        if (isSitting && playerRef.current) {
          playerRef.current.stand()
          setIsSitting(false)
          setSittingPosition(null) // 앉은 위치 리셋
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

      // V키로 1인칭/3인칭 시야 전환
      if (e.code === 'KeyV') {
        setIsFirstPerson((prev) => !prev)
        console.log('시야 전환:', !isFirstPerson ? '1인칭' : '3인칭')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [portalInfo, doorInfo, objectInfo, isSitting, isInstructor, screenShare, chat.isInputActive, isFirstPerson, handleMapChange, handleDoorEnter, handleObjectInteract])

  // Tab키로 메타버스 UI 메뉴 토글
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 채팅 입력 중이면 Tab 키 무시
      if (chat.isInputActive) return

      if (e.code === 'Tab') {
        e.preventDefault()
        const willOpen = !isMenuOpen
        setIsMenuOpen(willOpen)

        // 메뉴를 열 때 포인터 락 해제 (ESC와 동일한 동작)
        if (willOpen && document.pointerLockElement) {
          document.exitPointerLock()
        }

        console.log('메뉴 토글:', willOpen)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [chat.isInputActive, isMenuOpen])


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
            isInputDisabled={chat.isInputActive || isMenuOpen}
            isFirstPerson={isFirstPerson}
          />
          {/* 다른 플레이어들 렌더링 */}
          {Array.from(otherPlayers.values()).map((player) => (
            <OtherPlayer
              key={player.socketId}
              socketId={player.socketId}
              user={player.user}
              position={player.position}
              rotation={player.rotation}
              animation={player.animation}
            />
          ))}

          {/* 학생용 책상 위 모니터 (앉았을 때만 표시) */}
          {!isInstructor && isSitting && studentScreen.stream && sittingPosition && (
            <DeskMonitor
              stream={studentScreen.stream}
              position={[sittingPosition[0] + 0.9, sittingPosition[1] + 1.9, sittingPosition[2]]}
            />
          )}
        </Physics>

        <ThirdPersonCamera
          target={playerRef}
          onCameraRotate={handleCameraRotate}
          distance={isFirstPerson ? 0 : 10}
          height={isFirstPerson ? 2.0 : 6}
        />
      </Canvas>

      {/* 마이크 버튼 (모든 맵에서 사용 가능) */}
      <button
        onClick={() => {
          // 마이크 토글
          if (voiceChat.isMicOn) {
            voiceChat.turnOffMic()
          } else {
            voiceChat.turnOnMic()
          }
        }}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: voiceChat.isMicOn ? '#ef4444' : '#6b7280',
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
          background: voiceChat.isMicOn ? '#22c55e' : '#9ca3af',
          borderRadius: '50%',
          animation: voiceChat.isMicOn ? 'pulse 2s infinite' : 'none',
        }}></div>
        {voiceChat.isMicOn ? '🎤 마이크 끄기' : '🎤 마이크 켜기'}
        {voiceChat.isMicOn && voiceChat.connections.size > 0 && (
          <span style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
          }}>
            {voiceChat.connections.size}명 연결됨
          </span>
        )}
      </button>

      {/* Debug Info 토글 버튼 */}
      <button
        onClick={() => setShowDebugInfo((prev) => !prev)}
        style={{
          position: 'absolute',
          top: '80px',
          left: '20px',
          background: showDebugInfo ? '#3b82f6' : '#6b7280',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '14px',
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
        {showDebugInfo ? '🔍 Debug 끄기' : '🔍 Debug 켜기'}
      </button>

      {/* 음성 채팅 에러 표시 */}
      {voiceChat.error && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '20px',
            background: '#ef4444',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: 9999,
            maxWidth: '300px',
            fontSize: '14px',
          }}
        >
          {voiceChat.error}
        </div>
      )}

      {/* 학생용: 공유 화면 보기 버튼 (의자에 앉았을 때만 표시) */}
      {!isInstructor && isSitting && !isViewingScreen && (
        <button
          onClick={() => {
            console.log('[DEBUG] 버튼 클릭:', {
              hasTeacherInfo: !!screenReceive?.teacherInfo,
              teacherInfo: screenReceive?.teacherInfo,
              hasStream: !!screenReceive?.teacherStream
            })
            if (screenReceive?.teacherInfo) {
              setIsViewingScreen(true)
            } else {
              alert('강사가 아직 화면 공유를 시작하지 않았습니다.')
            }
          }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: screenReceive?.teacherInfo ? '#10b981' : '#6b7280',
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
            background: screenReceive?.teacherInfo ? '#ef4444' : '#9ca3af',
            borderRadius: '50%',
            animation: screenReceive?.teacherInfo ? 'pulse 2s infinite' : 'none',
          }}></div>
          📺 {screenReceive?.teacherInfo?.teacherName || '강사'}님의 화면 보기
          {!screenReceive?.teacherInfo && ' (대기 중...)'}
        </button>
      )}

      {/* 학생용: 내 화면 공유 버튼 (의자에 앉았을 때만 표시) */}
      {!isInstructor && isSitting && (
        <button
          onClick={() => {
            if (studentScreen.isSharing) {
              studentScreen.stopCapture()
            } else {
              studentScreen.startCapture()
            }
          }}
          style={{
            position: 'absolute',
            top: '80px',
            right: '20px',
            background: studentScreen.isSharing ? '#ef4444' : '#3b82f6',
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
            background: studentScreen.isSharing ? '#fca5a5' : '#60a5fa',
            borderRadius: '50%',
            animation: studentScreen.isSharing ? 'pulse 2s infinite' : 'none',
          }}></div>
          {studentScreen.isSharing ? '🖥️ 내 화면 공유 중지' : '🖥️ 내 화면 공유'}
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
      {showDebugInfo && (
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
          <div style={{ color: '#fff', marginBottom: '5px', fontWeight: 'bold' }}>
            Debug Info
          </div>
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
              <div style={{ color: currentClassroom ? '#10b981' : '#9ca3af' }}>
                Classroom: {currentClassroom ? `강의실 ${currentClassroom}` : '복도'}
              </div>
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
              <div style={{ color: voiceChat.isMicOn ? '#10b981' : '#ef4444' }}>
                Mic: {voiceChat.isMicOn ? '✅' : '❌'}
              </div>
              {voiceChat.isMicOn && (
                <div style={{ color: '#a78bfa', fontSize: '11px' }}>
                  Voice Connections: {voiceChat.connections.size}
                </div>
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
      )}

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

      {/* 교탁에 섰을 때 판서 버튼 (강사만) */}
      {isAtDesk && isInstructor && (
        <button
          onClick={handleWhiteboardToggle}
          style={{
            position: 'absolute',
            top: '80px',
            right: '20px',
            background: isWhiteboardActive ? '#10b981' : '#8b5cf6',
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
          {isWhiteboardActive ? '🎨 판서 중지' : '🎨 판서 시작'}
        </button>
      )}

      {/* 판서 컨트롤러 링크 (판서 활성화 시) */}
      {isAtDesk && isInstructor && isWhiteboardActive && (
        <div
          style={{
            position: 'absolute',
            top: '140px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            padding: '16px 20px',
            borderRadius: '8px',
            zIndex: 9999,
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            border: '2px solid #8b5cf6',
          }}
        >
          <div style={{ marginBottom: '12px', fontWeight: 'bold', color: '#c4b5fd' }}>
            📱 태블릿으로 접속하세요
          </div>
          <div
            style={{
              background: '#fff',
              color: '#000',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              marginBottom: '8px',
            }}
          >
            {window.location.origin}/whiteboard-controller?room={roomId}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            위 링크를 태블릿/폰으로 열어서 판서하세요
          </div>
        </div>
      )}

      {/* 게임 스타일 텍스트 채팅 (모든 맵에서 표시) */}
      <ChatBox
        messages={chat.messages}
        isInputActive={chat.isInputActive}
        inputText={chat.inputText}
        messagesEndRef={chat.messagesEndRef}
        onInputChange={chat.handleInputChange}
        onSendMessage={chat.sendMessage}
        onActivateInput={chat.activateInput}
        onDeactivateInput={chat.deactivateInput}
      />

      {/* 메타버스 UI 메뉴 (강의, 프로필, 대시보드, 결제내역) */}
      <MetaverseUI isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  )
}
