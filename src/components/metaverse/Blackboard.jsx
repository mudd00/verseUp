import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { socketService } from '../../services/socket'

/**
 * 3D 칠판 컴포넌트
 * - Canvas Texture로 판서 내용 표시
 * - Socket.IO로 실시간 동기화
 * - 태블릿 컨트롤러에서 그린 내용이 칠판에 나타남
 * - 기존 메시의 재질을 교체하는 방식
 */
export default function Blackboard({ targetMesh, roomId = 'metaverse-classroom-1' }) {
  const canvasRef = useRef(null)
  const textureRef = useRef(null)
  const [needsUpdate, setNeedsUpdate] = useState(false)

  // Canvas 초기화
  useEffect(() => {
    const canvas = document.createElement('canvas')
    // 칠판 메시 UV 범위에 맞춰 3배 확대 (UV가 1/3 영역만 사용)
    canvas.width = 6144   // 2048 * 3
    canvas.height = 1536  // 512 * 3 (4:1 비율 유지)

    const ctx = canvas.getContext('2d')

    // 배경색 (칠판 검정색)
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 그리기 설정
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    canvasRef.current = canvas

    // Texture 생성
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    // ⭐ UV 범위 보정 (측정된 실제 UV 범위 기준)
    // 측정 결과: U(0.502~0.759, 25.7%), V(0.010~0.991, 98.1%)
    const UV_MIN_U = 0.502
    const UV_MAX_U = 0.759
    const UV_RANGE_U = UV_MAX_U - UV_MIN_U  // 0.257

    const UV_MIN_V = 0.010
    const UV_MAX_V = 0.991
    const UV_RANGE_V = UV_MAX_V - UV_MIN_V  // 0.981

    // 270도 회전: 원 U → 새 V (세로), 원 V → 새 U (가로)
    texture.repeat.set(
      1 / UV_RANGE_V,  // X축: 원 V 범위 확대 (≈1.02)
      1 / UV_RANGE_U   // Y축: 원 U 범위 확대 (≈3.89) ← 핵심!
    )
    texture.offset.set(
      -UV_MIN_V / UV_RANGE_V,  // X축: 원 V 시작점 보정 (≈-0.01)
      -UV_MIN_U / UV_RANGE_U   // Y축: 원 U 시작점 보정 (≈-1.95)
    )

    // Texture를 270도 회전 (90도 + 180도 추가)
    texture.rotation = (Math.PI / 2) + Math.PI // 270도 시계방향
    texture.center.set(0.5, 0.5) // 중심점을 텍스처 중앙으로 설정

    textureRef.current = texture

    console.log('🎨 [Blackboard] Canvas initialized with rotation')
  }, [])

  // 타겟 메시의 재질을 Canvas Texture로 교체
  useEffect(() => {
    if (!targetMesh || !textureRef.current) return

    console.log('🎨 [Blackboard] 메시 재질 교체 중...', targetMesh.name)

    // 기존 재질을 Canvas Texture로 교체
    const newMaterial = new THREE.MeshBasicMaterial({
      map: textureRef.current,
      toneMapped: false,
    })

    targetMesh.material = newMaterial

    console.log('🎨 [Blackboard] 메시 재질 교체 완료!')

    return () => {
      // Cleanup: 재질 dispose
      newMaterial.dispose()
    }
  }, [targetMesh])

  // Socket 이벤트 리스너
  useEffect(() => {
    // 그리기 데이터 수신
    const handleDraw = (data) => {
      const { drawData } = data
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')

      // 좌표 변환 (0~1 비율 → 캔버스 픽셀)
      const fromX = drawData.fromX * canvas.width
      const fromY = drawData.fromY * canvas.height
      const toX = drawData.toX * canvas.width
      const toY = drawData.toY * canvas.height

      if (drawData.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
        ctx.lineWidth = drawData.lineWidth * 3
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = drawData.color
        ctx.lineWidth = drawData.lineWidth
      }

      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.stroke()

      setNeedsUpdate(true)
    }

    // 칠판 지우기
    const handleClear = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      setNeedsUpdate(true)
      console.log('🎨 [Blackboard] Canvas cleared')
    }

    socketService.on('whiteboard:draw', handleDraw)
    socketService.on('whiteboard:cleared', handleClear)

    return () => {
      socketService.off('whiteboard:draw', handleDraw)
      socketService.off('whiteboard:cleared', handleClear)
    }
  }, [])

  // Texture 업데이트
  useFrame(() => {
    if (needsUpdate && textureRef.current) {
      textureRef.current.needsUpdate = true
      setNeedsUpdate(false)
    }
  })

  // 기존 메시의 재질을 교체하는 방식이므로 렌더링할 것 없음
  return null
}
