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
    canvas.width = 2048
    canvas.height = 682 // 3:1 비율 (2048 / 3)

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

    // Texture를 270도 회전 (90도 + 180도 추가)
    texture.rotation = (Math.PI / 2) + Math.PI // 270도 시계방향
    texture.center.set(0.5, 0.5) // 중심점을 텍스처 중앙으로 설정

    // Texture를 위로 이동 (밑 부분 잘림 방지)
    texture.offset.set(0, 0.1) // Y축으로 10% 위로 이동

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
