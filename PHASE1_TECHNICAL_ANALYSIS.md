# VerseUp! 1차 프로젝트 기술 분석서

> 실제 코드 분석 기반 상세 기술 문서
> 2차 프로젝트 개발자를 위한 참조 자료

---

## 1. 인증 시스템 상세 분석

### 1.1 프론트엔드 인증 흐름

#### Supabase 클라이언트 초기화 (`src/lib/supabase.js`)
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### Zustand 인증 스토어 (`src/stores/authStore.js`)
```javascript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),

      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        set({
          user: data.user,
          token: data.session?.access_token,
          isAuthenticated: true,
        })
        return data
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, token: null, isAuthenticated: false })
      },

      // 세션 복원 (앱 시작 시)
      initializeAuth: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          set({
            user: session.user,
            token: session.access_token,
            isAuthenticated: true,
          })
        }
        set({ isLoading: false })
      },
    }),
    { name: 'auth-storage' }
  )
)
```

#### 역할 판단 로직
사용자 역할은 `user.user_metadata.role`에서 가져옴. 없으면 이메일 접두사로 추론:
```javascript
const getRole = (user) => {
  if (user?.user_metadata?.role) return user.user_metadata.role

  const email = user?.email || ''
  if (email.startsWith('admin@')) return 'admin'
  if (email.startsWith('instructor@')) return 'instructor'
  if (email.startsWith('parent@')) return 'parent'
  return 'student'
}
```

### 1.2 백엔드 인증 미들웨어

#### JWT 검증 (`server/middleware/auth.js`)
```javascript
import jwt from 'jsonwebtoken'
import { supabase } from '../utils/supabase.js'

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]

    // Supabase JWT 검증
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // 프로필 정보 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    req.user = { ...user, ...profile }
    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

// 역할 체크 미들웨어
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

export const requireInstructor = requireRole('instructor', 'admin')
export const requireAdmin = requireRole('admin')
```

### 1.3 학부모 초대 코드 시스템

#### 초대 코드 생성 (학생) - `server/routes/invites.js`
```javascript
router.post('/generate', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can generate invite codes' })
  }

  // 6자리 랜덤 코드 생성
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일 후 만료

  const { data, error } = await supabase
    .from('parent_student_links')
    .insert({
      student_id: req.user.id,
      invite_code: code,
      status: 'pending',
      code_expires_at: expiresAt,
    })
    .select()
    .single()

  res.json({ code, expiresAt })
})
```

#### 부모 가입 (초대 코드 사용) - `server/routes/auth.js`
```javascript
router.post('/register-parent', async (req, res) => {
  const { email, password, name, inviteCode } = req.body

  // 1. 초대 코드 확인
  const { data: invite } = await supabase
    .from('parent_student_links')
    .select('*')
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')
    .gt('code_expires_at', new Date().toISOString())
    .single()

  if (!invite) {
    return res.status(400).json({ error: 'Invalid or expired invite code' })
  }

  // 2. Supabase Auth로 사용자 생성
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { role: 'parent', name },
    email_confirm: true,
  })

  if (authError) {
    return res.status(400).json({ error: authError.message })
  }

  // 3. 프로필 생성 + 초대 코드 상태 업데이트
  await supabase.from('profiles').insert({
    id: authData.user.id,
    email,
    name,
    role: 'parent',
  })

  await supabase
    .from('parent_student_links')
    .update({ parent_id: authData.user.id, status: 'active', linked_at: new Date() })
    .eq('id', invite.id)

  res.json({ success: true })
})
```

---

## 2. 강의 시스템 상세 분석

### 2.1 강의 목록 조회 (검색/필터/정렬)

#### `server/routes/courses.js`
```javascript
router.get('/', async (req, res) => {
  const {
    search,
    category,
    instructor_id,
    status = 'published',
    sort = 'created_at',
    order = 'desc',
    page = 1,
    limit = 12
  } = req.query

  let query = supabase
    .from('courses')
    .select(`
      *,
      instructor:profiles!instructor_id(id, name, avatar_url),
      classroom:classrooms(id, name),
      time_slot:time_slots(id, day_of_week, start_time, end_time)
    `, { count: 'exact' })
    .eq('status', status)

  // 검색
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // 필터
  if (category) query = query.eq('category', category)
  if (instructor_id) query = query.eq('instructor_id', instructor_id)

  // 정렬
  query = query.order(sort, { ascending: order === 'asc' })

  // 페이지네이션
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  res.json({
    courses: data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  })
})
```

### 2.2 수강 신청 (동시성 처리)

```javascript
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  const courseId = req.params.id
  const studentId = req.user.id

  // 1. 강의 정보 확인
  const { data: course } = await supabase
    .from('courses')
    .select('*, enrolled_count, max_students')
    .eq('id', courseId)
    .single()

  if (!course) {
    return res.status(404).json({ error: 'Course not found' })
  }

  // 2. 정원 확인
  if (course.enrolled_count >= course.max_students) {
    return res.status(400).json({ error: 'Course is full' })
  }

  // 3. 중복 수강 확인
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .single()

  if (existing) {
    return res.status(400).json({ error: 'Already enrolled' })
  }

  // 4. 시간대 충돌 확인 (RPC 함수 사용)
  const { data: conflict } = await supabase.rpc('check_schedule_conflict', {
    p_student_id: studentId,
    p_time_slot_id: course.time_slot_id,
  })

  if (conflict) {
    return res.status(400).json({ error: 'Schedule conflict with another course' })
  }

  // 5. 수강 등록 + 인원 증가 (트랜잭션)
  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .insert({ course_id: courseId, student_id: studentId, status: 'active' })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: 'Enrollment failed' })
  }

  // enrolled_count 증가
  await supabase
    .from('courses')
    .update({ enrolled_count: course.enrolled_count + 1 })
    .eq('id', courseId)

  res.json({ enrollment })
})
```

### 2.3 프론트엔드 강의 목록 (`src/pages/Courses.jsx`)

```javascript
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/services/api'

export default function Courses() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['courses', { search, category, page }],
    queryFn: () => api.get('/courses', {
      params: { search, category, page, limit: 12 }
    }).then(res => res.data),
    keepPreviousData: true,
  })

  return (
    <div>
      {/* 검색/필터 UI */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="강의 검색..."
      />

      {/* 강의 그리드 */}
      <div className="grid grid-cols-3 gap-4">
        {data?.courses?.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {/* 페이지네이션 */}
      <Pagination
        page={page}
        totalPages={data?.pagination?.totalPages}
        onChange={setPage}
      />
    </div>
  )
}
```

---

## 3. 결제 시스템 상세 분석

### 3.1 토스페이먼츠 결제 흐름

```
[사용자] → [결제 요청] → [토스 결제창] → [결제 완료]
                                              ↓
[서버] ← [승인 요청] ← [successUrl 리다이렉트]
   ↓
[토스 API 승인] → [DB 저장] → [수강 등록] → [완료 페이지]
```

### 3.2 프론트엔드 결제 요청 (`src/pages/Payment.jsx`)

```javascript
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'

const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY

export default function Payment() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)

  const handlePayment = async () => {
    const tossPayments = await loadTossPayments(clientKey)
    const payment = tossPayments.payment({ customerKey: TossPayments.ANONYMOUS })

    const orderId = `ORDER_${Date.now()}_${courseId}`

    await payment.requestPayment({
      method: 'CARD',
      amount: {
        currency: 'KRW',
        value: course.price,
      },
      orderId,
      orderName: course.title,
      successUrl: `${window.location.origin}/payment/success`,
      failUrl: `${window.location.origin}/payment/fail`,
      customerEmail: user.email,
      customerName: user.name,
      card: {
        useEscrow: false,
        flowMode: 'DEFAULT',
        useCardPoint: false,
        useAppCardOnly: false,
      },
    })
  }

  return (
    <div>
      <h1>결제하기</h1>
      <p>강의: {course?.title}</p>
      <p>금액: {course?.price?.toLocaleString()}원</p>
      <button onClick={handlePayment}>결제하기</button>
    </div>
  )
}
```

### 3.3 결제 성공 페이지 (`src/pages/PaymentSuccess.jsx`)

```javascript
export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get('paymentKey')
      const orderId = searchParams.get('orderId')
      const amount = searchParams.get('amount')

      try {
        // 서버에 결제 승인 요청
        const response = await api.post('/payments/confirm', {
          paymentKey,
          orderId,
          amount: parseInt(amount),
        })

        if (response.data.success) {
          toast.success('결제가 완료되었습니다!')
          navigate('/my-courses')
        }
      } catch (error) {
        toast.error('결제 확인 중 오류가 발생했습니다')
        navigate('/payment/fail')
      }
    }

    confirmPayment()
  }, [])

  return <div>결제 처리 중...</div>
}
```

### 3.4 서버 결제 승인 (`server/routes/payments.js`)

```javascript
router.post('/confirm', authMiddleware, async (req, res) => {
  const { paymentKey, orderId, amount } = req.body
  const userId = req.user.id

  // 1. 토스페이먼츠 API로 결제 승인
  const secretKey = process.env.TOSS_SECRET_KEY
  const encryptedSecretKey = Buffer.from(secretKey + ':').toString('base64')

  const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encryptedSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  const paymentResult = await tossResponse.json()

  if (!tossResponse.ok) {
    return res.status(400).json({ error: paymentResult.message })
  }

  // 2. orderId에서 courseId 추출 (ORDER_timestamp_courseId 형식)
  const courseId = orderId.split('_')[2]

  // 3. DB에 결제 정보 저장
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      course_id: courseId,
      order_id: orderId,
      payment_key: paymentKey,
      amount,
      status: 'completed',
      method: paymentResult.method,
      order_name: paymentResult.orderName,
      approved_at: paymentResult.approvedAt,
      receipt_url: paymentResult.receipt?.url,
    })
    .select()
    .single()

  // 4. 자동 수강 등록
  await supabase.from('enrollments').insert({
    course_id: courseId,
    student_id: userId,
    status: 'active',
    payment_id: payment.id,
  })

  // 5. enrolled_count 증가
  await supabase.rpc('increment_enrolled_count', { course_id: courseId })

  res.json({ success: true, payment })
})
```

---

## 4. 3D 메타버스 시스템 상세 분석

### 4.1 메인 씬 구조 (`src/components/metaverse/MetaverseScene.jsx`)

```javascript
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Sky, Environment } from '@react-three/drei'

export default function MetaverseScene({ roomId, currentUser, otherUsers }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 5, 10], fov: 60 }}
      style={{ width: '100vw', height: '100vh' }}
    >
      {/* 조명 */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />

      {/* 환경 */}
      <Sky sunPosition={[100, 20, 100]} />
      <Environment preset="sunset" />
      <fog attach="fog" args={['#87CEEB', 50, 200]} />

      {/* 물리 월드 */}
      <Physics gravity={[0, -20, 0]} debug={false}>
        {/* 맵 */}
        <MapModel />

        {/* 내 캐릭터 */}
        <Player
          roomId={roomId}
          user={currentUser}
        />

        {/* 다른 플레이어들 */}
        {otherUsers.map(user => (
          <OtherPlayer
            key={user.socketId}
            position={user.position}
            rotation={user.rotation}
            animation={user.animation}
            userName={user.user?.name}
          />
        ))}

        {/* 화면 공유 스크린 */}
        {teacherStream && (
          <Screen
            position={[0, 5, -15]}
            videoStream={teacherStream}
          />
        )}
      </Physics>

      {/* 카메라 */}
      <ThirdPersonCamera />
    </Canvas>
  )
}
```

### 4.2 플레이어 컨트롤러 (`src/components/metaverse/Player.jsx`)

```javascript
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import { Vector3 } from 'three'
import { useKeyboardControls } from './useKeyboardControls'
import CharacterModel from './CharacterModel'
import { socketService } from '@/services/socket'

// 물리 설정 상수
const WALK_SPEED = 8
const RUN_SPEED = 18
const STEP_UP_SPEED = 4

export default function Player({ roomId, user }) {
  const rigidBodyRef = useRef()
  const { forward, backward, left, right, shift } = useKeyboardControls()
  const lastPosition = useRef(new Vector3())
  const isMoving = useRef(false)

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return

    const rigidBody = rigidBodyRef.current
    const velocity = rigidBody.linvel()

    // 이동 방향 계산
    const direction = new Vector3()

    // 카메라 방향 기준 이동
    const cameraDirection = new Vector3()
    state.camera.getWorldDirection(cameraDirection)
    cameraDirection.y = 0
    cameraDirection.normalize()

    const cameraRight = new Vector3()
    cameraRight.crossVectors(cameraDirection, new Vector3(0, 1, 0))

    if (forward) direction.add(cameraDirection)
    if (backward) direction.sub(cameraDirection)
    if (left) direction.sub(cameraRight)
    if (right) direction.add(cameraRight)

    direction.normalize()

    // 속도 적용
    const speed = shift ? RUN_SPEED : WALK_SPEED
    const moving = direction.length() > 0

    if (moving) {
      rigidBody.setLinvel({
        x: direction.x * speed,
        y: velocity.y, // 중력 유지
        z: direction.z * speed,
      })

      // 캐릭터 회전
      const angle = Math.atan2(direction.x, direction.z)
      rigidBody.setRotation({ x: 0, y: angle, z: 0, w: 1 })
    } else {
      // 정지 시 수평 속도 감소
      rigidBody.setLinvel({
        x: velocity.x * 0.9,
        y: velocity.y,
        z: velocity.z * 0.9,
      })
    }

    // 위치 동기화 (변화가 있을 때만)
    const position = rigidBody.translation()
    const positionVec = new Vector3(position.x, position.y, position.z)

    if (positionVec.distanceTo(lastPosition.current) > 0.01) {
      const rotation = rigidBody.rotation()
      const animation = moving ? (shift ? 'Run' : 'Walk') : 'Idle'

      socketService.emit('player:move', {
        roomId,
        position: [position.x, position.y, position.z],
        rotation: Math.atan2(2 * (rotation.w * rotation.y), 1 - 2 * rotation.y * rotation.y),
        animation,
      })

      lastPosition.current.copy(positionVec)
      isMoving.current = moving
    }
  })

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      position={[0, 2, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={0.5}
    >
      <CapsuleCollider args={[0.8, 0.52]} position={[0, 1.28, 0]} />
      <CharacterModel isMoving={isMoving.current} isRunning={shift} />
    </RigidBody>
  )
}
```

### 4.3 키보드 입력 훅 (`src/components/metaverse/useKeyboardControls.js`)

```javascript
import { useState, useEffect } from 'react'

export function useKeyboardControls() {
  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false,
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.code
      setKeys((prev) => ({
        ...prev,
        forward: key === 'KeyW' || key === 'ArrowUp' ? true : prev.forward,
        backward: key === 'KeyS' || key === 'ArrowDown' ? true : prev.backward,
        left: key === 'KeyA' || key === 'ArrowLeft' ? true : prev.left,
        right: key === 'KeyD' || key === 'ArrowRight' ? true : prev.right,
        shift: key === 'ShiftLeft' || key === 'ShiftRight' ? true : prev.shift,
      }))
    }

    const handleKeyUp = (e) => {
      const key = e.code
      setKeys((prev) => ({
        ...prev,
        forward: key === 'KeyW' || key === 'ArrowUp' ? false : prev.forward,
        backward: key === 'KeyS' || key === 'ArrowDown' ? false : prev.backward,
        left: key === 'KeyA' || key === 'ArrowLeft' ? false : prev.left,
        right: key === 'KeyD' || key === 'ArrowRight' ? false : prev.right,
        shift: key === 'ShiftLeft' || key === 'ShiftRight' ? false : prev.shift,
      }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return keys
}
```

### 4.4 캐릭터 모델 + 애니메이션 (`src/components/metaverse/CharacterModel.jsx`)

```javascript
import { useRef, useEffect } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'

export default function CharacterModel({ isMoving, isRunning }) {
  const group = useRef()
  const { scene, animations } = useGLTF('/models/BaseCharacter.gltf')
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    // 모든 애니메이션 정지
    Object.values(actions).forEach((action) => action?.stop())

    // 현재 상태에 맞는 애니메이션 재생
    let currentAction
    if (!isMoving) {
      currentAction = actions['Idle']
    } else if (isRunning) {
      currentAction = actions['Run'] || actions['Running']
    } else {
      currentAction = actions['Walk'] || actions['Walking']
    }

    if (currentAction) {
      currentAction.reset().fadeIn(0.2).play()
    }

    return () => {
      currentAction?.fadeOut(0.2)
    }
  }, [isMoving, isRunning, actions])

  return (
    <group ref={group}>
      <primitive
        object={scene.clone()}
        scale={0.8}
        position={[0, 0, 0]}
      />
    </group>
  )
}

useGLTF.preload('/models/BaseCharacter.gltf')
```

### 4.5 3인칭 카메라 (`src/components/metaverse/ThirdPersonCamera.jsx`)

```javascript
import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

export default function ThirdPersonCamera() {
  const { camera, gl } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(-0.3)
  const distance = 8
  const isLocked = useRef(false)

  useEffect(() => {
    const canvas = gl.domElement

    const handleClick = () => {
      canvas.requestPointerLock()
    }

    const handleLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas
    }

    const handleMouseMove = (e) => {
      if (!isLocked.current) return

      yaw.current -= e.movementX * 0.002
      pitch.current -= e.movementY * 0.002

      // 피치 제한 (위아래 각도)
      pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 6, pitch.current))
    }

    canvas.addEventListener('click', handleClick)
    document.addEventListener('pointerlockchange', handleLockChange)
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      canvas.removeEventListener('click', handleClick)
      document.removeEventListener('pointerlockchange', handleLockChange)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [gl])

  useFrame(() => {
    // 플레이어 위치 기준 카메라 위치 계산
    const playerPosition = new Vector3(0, 2, 0) // 실제로는 Player에서 가져와야 함

    const offsetX = Math.sin(yaw.current) * Math.cos(pitch.current) * distance
    const offsetY = Math.sin(pitch.current) * distance + 2
    const offsetZ = Math.cos(yaw.current) * Math.cos(pitch.current) * distance

    camera.position.set(
      playerPosition.x + offsetX,
      playerPosition.y + offsetY,
      playerPosition.z + offsetZ
    )

    camera.lookAt(playerPosition)
  })

  return null
}
```

---

## 5. Socket.IO 실시간 통신 상세 분석

### 5.1 클라이언트 소켓 서비스 (`src/services/socket.js`)

```javascript
import { io } from 'socket.io-client'
import { SOCKET_URL } from '@/utils/constants'

class SocketService {
  constructor() {
    this.socket = null
    this.pendingListeners = [] // 연결 전 등록된 리스너 대기열
    this.keepAliveInterval = null
  }

  connect(token) {
    if (this.socket) return this.socket

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id)

      // 대기 중인 리스너 등록
      this.pendingListeners.forEach(({ event, callback }) => {
        this.socket.on(event, callback)
      })
      this.pendingListeners = []
    })

    // 탭 비활성화 시 연결 유지
    this.setupVisibilityHandler()

    return this.socket
  }

  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 10초마다 ping으로 연결 유지
        this.keepAliveInterval = setInterval(() => {
          if (this.socket?.connected) {
            this.socket.emit('ping')
          }
        }, 10000)
      } else {
        clearInterval(this.keepAliveInterval)
        // 연결 끊어졌으면 재연결
        if (this.socket && !this.socket.connected) {
          this.socket.connect()
        }
      }
    })
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback)
    } else {
      // 소켓 없으면 대기열에 추가
      this.pendingListeners.push({ event, callback })
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
    // 대기열에서도 제거
    this.pendingListeners = this.pendingListeners.filter(
      (l) => !(l.event === event && l.callback === callback)
    )
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn(`Socket not connected, cannot emit: ${event}`)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }
}

export const socketService = new SocketService()
```

### 5.2 서버 소켓 핸들러 주요 부분 (`server/sockets/index.js`)

```javascript
// 데이터 저장소
const connectedUsers = new Map()    // socketId -> user info
const rooms = new Map()             // roomId -> Set<socketId>
const screenSharing = new Map()     // roomId -> teacher info
const studentScreenSharing = new Map() // socketId -> sharing info

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)

    // 사용자 입장
    socket.on('user:join', (userData) => {
      const socketUser = {
        id: userData.user.id,
        socketId: socket.id,
        user: userData.user,
        isObserver: userData.isObserver || false,
      }

      connectedUsers.set(socket.id, socketUser)
      socket.join(`user:${userData.user.id}`)

      // roomId가 있으면 자동으로 방 입장
      if (userData.roomId) {
        socket.join(userData.roomId)
        if (!rooms.has(userData.roomId)) {
          rooms.set(userData.roomId, new Set())
        }
        rooms.get(userData.roomId).add(socket.id)

        // 다른 사용자들에게 알림 (참관자 제외)
        if (!socketUser.isObserver) {
          io.to(userData.roomId).emit('room:user-joined', {
            user: userData.user,
            socketId: socket.id,
            position: [0, 2, 0],
          })
        }

        // 현재 방 사용자 목록 전송
        const roomUsers = Array.from(rooms.get(userData.roomId) || [])
          .map(id => connectedUsers.get(id))
          .filter(u => u && !u.isObserver)
        socket.emit('room:users', { users: roomUsers })
      }
    })

    // 위치 동기화
    socket.on('player:move', (data) => {
      const { roomId, position, rotation, animation } = data
      const user = connectedUsers.get(socket.id)

      if (user && !user.isObserver) {
        user.position = position
        user.rotation = rotation
        user.animation = animation

        socket.to(roomId).emit('player:moved', {
          socketId: socket.id,
          userId: user.id,
          user: user.user,
          position,
          rotation,
          animation,
        })
      }
    })

    // 채팅
    socket.on('chat:message', (data) => {
      const { roomId, message } = data
      const user = connectedUsers.get(socket.id)

      if (user) {
        io.to(roomId).emit('chat:message', {
          id: `${Date.now()}-${socket.id}`,
          userId: user.id,
          userName: user.user.name,
          message,
          timestamp: new Date().toISOString(),
        })
      }
    })

    // 화면 공유 시작
    socket.on('screenshare:start', (data) => {
      const { roomId } = data
      const user = connectedUsers.get(socket.id)

      screenSharing.set(roomId, {
        teacherId: user.id,
        teacherSocketId: socket.id,
        teacherName: user.user.name,
      })

      io.to(roomId).emit('screenshare:started', {
        teacherId: user.id,
        teacherSocketId: socket.id,
        teacherName: user.user.name,
      })
    })

    // WebRTC 시그널링
    socket.on('screenshare:offer', (data) => {
      io.to(data.targetSocketId).emit('screenshare:offer', {
        fromSocketId: socket.id,
        offer: data.offer,
      })
    })

    socket.on('screenshare:answer', (data) => {
      io.to(data.targetSocketId).emit('screenshare:answer', {
        fromSocketId: socket.id,
        answer: data.answer,
      })
    })

    socket.on('screenshare:ice-candidate', (data) => {
      io.to(data.targetSocketId).emit('screenshare:ice-candidate', {
        fromSocketId: socket.id,
        candidate: data.candidate,
      })
    })

    // 연결 종료
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id)

      if (user?.roomId) {
        rooms.get(user.roomId)?.delete(socket.id)

        if (!user.isObserver) {
          socket.to(user.roomId).emit('room:user-left', {
            userId: user.id,
            socketId: socket.id,
          })
        }

        // 화면 공유 중이었다면 종료
        const sharing = screenSharing.get(user.roomId)
        if (sharing?.teacherSocketId === socket.id) {
          screenSharing.delete(user.roomId)
          socket.to(user.roomId).emit('screenshare:stopped', {
            teacherId: user.id,
          })
        }
      }

      connectedUsers.delete(socket.id)
    })
  })
}
```

---

## 6. WebRTC 화면 공유 상세 분석

### 6.1 화면 공유 훅 - 강사용 (`src/hooks/useScreenShare.js`)

```javascript
import { useState, useRef, useCallback, useEffect } from 'react'
import { socketService } from '@/services/socket'
import { getRTCConfiguration } from '@/utils/webrtc'

export function useScreenShare(roomId, students = [], enabled = true) {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState(null)
  const streamRef = useRef(null)
  const peerConnectionsRef = useRef(new Map())

  // 학생에게 연결 생성
  const createPeerConnection = useCallback((studentSocketId) => {
    const pc = new RTCPeerConnection(getRTCConfiguration())

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('screenshare:ice-candidate', {
          targetSocketId: studentSocketId,
          candidate: event.candidate,
        })
      }
    }

    return pc
  }, [])

  // Offer 전송
  const sendOfferToStudent = useCallback(async (studentSocketId) => {
    const pc = createPeerConnection(studentSocketId)
    peerConnectionsRef.current.set(studentSocketId, pc)

    // 스트림의 모든 트랙 추가
    streamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current)
    })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    socketService.emit('screenshare:offer', {
      targetSocketId: studentSocketId,
      offer,
    })
  }, [createPeerConnection])

  // 화면 공유 시작
  const startSharing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      })

      streamRef.current = stream
      setIsSharing(true)

      // 공유 중지 감지 (브라우저 UI로 중지 시)
      stream.getVideoTracks()[0].onended = () => stopSharing()

      // 서버에 알림
      socketService.emit('screenshare:start', { roomId })

      // 모든 학생에게 offer 전송
      students.forEach((student) => {
        if (student.socketId) {
          sendOfferToStudent(student.socketId)
        }
      })
    } catch (error) {
      setError(error.message)
    }
  }, [roomId, students, sendOfferToStudent])

  // Answer 수신 처리
  useEffect(() => {
    if (!enabled) return

    const handleAnswer = async ({ fromSocketId, answer }) => {
      const pc = peerConnectionsRef.current.get(fromSocketId)
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      }
    }

    socketService.on('screenshare:answer', handleAnswer)
    return () => socketService.off('screenshare:answer', handleAnswer)
  }, [enabled])

  // ICE candidate 수신 처리
  useEffect(() => {
    if (!enabled) return

    const handleIce = async ({ fromSocketId, candidate }) => {
      const pc = peerConnectionsRef.current.get(fromSocketId)
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    }

    socketService.on('screenshare:ice-candidate', handleIce)
    return () => socketService.off('screenshare:ice-candidate', handleIce)
  }, [enabled])

  const stopSharing = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    streamRef.current = null
    setIsSharing(false)
    socketService.emit('screenshare:stop', { roomId })
  }, [roomId])

  return { isSharing, error, startSharing, stopSharing }
}
```

### 6.2 화면 수신 훅 - 학생용 (`src/hooks/useScreenReceive.js`)

```javascript
export function useScreenReceive(roomId, enabled = true) {
  const [teacherStream, setTeacherStream] = useState(null)
  const [isReceiving, setIsReceiving] = useState(false)
  const [teacherInfo, setTeacherInfo] = useState(null)
  const peerConnectionRef = useRef(null)

  // 화면 공유 시작 알림 수신
  useEffect(() => {
    if (!enabled) return

    const handleStarted = (data) => {
      setTeacherInfo(data)
    }

    socketService.on('screenshare:started', handleStarted)
    return () => socketService.off('screenshare:started', handleStarted)
  }, [enabled])

  // Offer 수신 처리
  useEffect(() => {
    if (!enabled) return

    const handleOffer = async ({ fromSocketId, offer }) => {
      // 기존 연결 정리
      peerConnectionRef.current?.close()

      const pc = new RTCPeerConnection(getRTCConfiguration())
      peerConnectionRef.current = pc

      // 스트림 수신
      pc.ontrack = (event) => {
        setTeacherStream(event.streams[0])
        setIsReceiving(true)
      }

      // ICE candidate 전송
      pc.onicecandidate = (event) => {
        if (event.candidate && teacherInfo) {
          socketService.emit('screenshare:ice-candidate', {
            targetSocketId: teacherInfo.teacherSocketId,
            candidate: event.candidate,
          })
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socketService.emit('screenshare:answer', {
        targetSocketId: fromSocketId,
        answer,
      })
    }

    socketService.on('screenshare:offer', handleOffer)
    return () => socketService.off('screenshare:offer', handleOffer)
  }, [enabled, teacherInfo])

  return { teacherStream, isReceiving, teacherInfo }
}
```

### 6.3 ICE 서버 설정 (`src/utils/webrtc.js`)

```javascript
export function getIceServers() {
  const iceServers = [
    // Google STUN
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]

  // 환경변수에서 TURN 서버 설정
  const turnUrl = import.meta.env.VITE_TURN_SERVER_URL
  const turnUsername = import.meta.env.VITE_TURN_USERNAME
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    })
  } else {
    // 무료 OpenRelay TURN 서버
    iceServers.push(
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
    )
  }

  return iceServers
}

export function getRTCConfiguration() {
  return {
    iceServers: getIceServers(),
    iceCandidatePoolSize: 10,
  }
}
```

---

## 7. 프론트엔드 라우팅 구조

### `src/App.jsx`

```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import PrivateRoute from '@/components/PrivateRoute'
import AdminRoute from '@/components/AdminRoute'

// Pages
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import RegisterParent from '@/pages/RegisterParent'
import Dashboard from '@/pages/Dashboard'
import Courses from '@/pages/Courses'
import CourseDetail from '@/pages/CourseDetail'
import CreateCourse from '@/pages/CreateCourse'
import Metaverse from '@/pages/Metaverse'
import Payment from '@/pages/Payment'
import PaymentSuccess from '@/pages/PaymentSuccess'
// ...

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 공개 페이지 */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/parent" element={<RegisterParent />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
        </Route>

        {/* 인증 필요 페이지 */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/courses/create" element={<CreateCourse />} />
          <Route path="/courses/:id/edit" element={<EditCourse />} />
          <Route path="/my-courses" element={<MyCourses />} />
          <Route path="/payment/:courseId" element={<Payment />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/fail" element={<PaymentFail />} />
          <Route path="/payment/history" element={<PaymentHistory />} />
        </Route>

        {/* 메타버스 (레이아웃 없음, 전체 화면) */}
        <Route element={<PrivateRoute />}>
          <Route path="/metaverse" element={<Metaverse />} />
          <Route path="/metaverse/:roomId" element={<Metaverse />} />
        </Route>

        {/* 관리자 페이지 */}
        <Route element={<AdminRoute><Layout /></AdminRoute>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/courses" element={<CourseManagement />} />
        </Route>

        {/* 에러 페이지 */}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
```

---

## 8. 환경 변수 설정

### `.env.example`
```bash
# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...

# Frontend Supabase (VITE_ prefix)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# API/Socket
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000

# JWT
JWT_SECRET=your-jwt-secret-key

# Toss Payments
VITE_TOSS_CLIENT_KEY=test_ck_xxxxx
TOSS_SECRET_KEY=test_sk_xxxxx

# TURN Server (optional)
VITE_TURN_SERVER_URL=
VITE_TURN_USERNAME=
VITE_TURN_CREDENTIAL=
```

---

## 9. 주의사항 및 알려진 이슈

### 9.1 3D 관련
- **애니메이션 이름으로 찾기**: `actions['Idle']` O, `Object.values(actions)[0]` X
- **모델 복제**: FBX는 `SkeletonUtils.clone()` 필요
- **물리 설정 수정 금지**: Player 캡슐 콜라이더 값 튜닝됨

### 9.2 Socket.IO 관련
- **pendingListeners 패턴**: 소켓 연결 전 리스너 등록 시 대기열 사용
- **탭 비활성화**: keep-alive ping으로 연결 유지

### 9.3 WebRTC 관련
- **TURN 서버 필수**: 프로덕션에서는 STUN만으로 부족
- **오디오 활성화**: `getDisplayMedia({ audio: true })`

### 9.4 Supabase 관련
- **RLS 정책**: 백엔드에서 service_key 사용 시 RLS 우회됨
- **Storage 버킷**: `course-materials`, `assignment-submissions` 등

---

## 10. 2차 프로젝트 참고용 체크리스트

### Spring Boot로 마이그레이션 시

- [ ] Entity 클래스 정의 (12개 테이블)
- [ ] JPA Repository 인터페이스 생성
- [ ] Spring Security 설정 (JWT 필터)
- [ ] RestController 작성 (18개 라우트 파일 참조)
- [ ] WebSocket 핸들러 구현 (Socket.IO 이벤트 참조)
- [ ] 파일 업로드 서비스 (S3 또는 로컬)
- [ ] 결제 서비스 (토스페이먼츠 API 연동)

### 프론트엔드 수정 사항

- [ ] API 엔드포인트 URL 변경 (`services/api.js`)
- [ ] WebSocket 클라이언트 변경 (STOMP)
- [ ] 인증 토큰 형식 맞춤
- [ ] 응답 데이터 형식 맞춤

---

*이 문서는 실제 코드 분석을 기반으로 작성되었습니다.*
*2차 프로젝트 개발 시 참조 자료로 활용하세요.*
