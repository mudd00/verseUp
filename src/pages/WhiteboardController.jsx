import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { socketService } from '../services/socket'

/**
 * 태블릿/폰용 판서 컨트롤러
 * - 터치 최적화
 * - 실시간 그리기 데이터 전송
 * - Socket.IO로 메타버스 칠판과 동기화
 */
export default function WhiteboardController() {
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('room') || 'metaverse-classroom-1'

  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#ffffff')
  const [lineWidth, setLineWidth] = useState(5)
  const [tool, setTool] = useState('pen') // 'pen' | 'eraser'
  const lastPointRef = useRef(null)

  // Canvas 초기화
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    // 캔버스 크기 설정 (고해상도)
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    ctx.scale(dpr, dpr)

    // 배경 검정색
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 그리기 설정
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  // Socket 연결 및 판서 시작
  useEffect(() => {
    socketService.emit('whiteboard:start', { roomId })

    return () => {
      socketService.emit('whiteboard:stop', { roomId })
    }
  }, [roomId])

  // 그리기 함수
  const draw = (x, y, isStart = false) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()

    // 캔버스 좌표로 변환
    const canvasX = x - rect.left
    const canvasY = y - rect.top

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = lineWidth * 3
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
    }

    if (isStart || !lastPointRef.current) {
      ctx.beginPath()
      ctx.moveTo(canvasX, canvasY)
      lastPointRef.current = { x: canvasX, y: canvasY }
    } else {
      ctx.beginPath()
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
      ctx.lineTo(canvasX, canvasY)
      ctx.stroke()

      // Socket으로 그리기 데이터 전송
      const drawData = {
        tool,
        color,
        lineWidth,
        fromX: lastPointRef.current.x / rect.width,
        fromY: lastPointRef.current.y / rect.height,
        toX: canvasX / rect.width,
        toY: canvasY / rect.height,
      }

      socketService.emit('whiteboard:draw', { roomId, drawData })

      lastPointRef.current = { x: canvasX, y: canvasY }
    }
  }

  // 마우스 이벤트
  const handleMouseDown = (e) => {
    setIsDrawing(true)
    draw(e.clientX, e.clientY, true)
  }

  const handleMouseMove = (e) => {
    if (!isDrawing) return
    draw(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    lastPointRef.current = null
  }

  // 터치 이벤트
  const handleTouchStart = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    setIsDrawing(true)
    draw(touch.clientX, touch.clientY, true)
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (!isDrawing) return
    const touch = e.touches[0]
    draw(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = (e) => {
    e.preventDefault()
    setIsDrawing(false)
    lastPointRef.current = null
  }

  // 전체 지우기
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    socketService.emit('whiteboard:clear', { roomId })
  }

  const colors = ['#ffffff', '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff']
  const widths = [2, 5, 10, 15]

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* 헤더 */}
      <div className="bg-gray-800 p-4 shadow-lg">
        <h1 className="text-xl font-bold text-white mb-2">🎨 판서 컨트롤러</h1>
        <p className="text-sm text-gray-400">Room: {roomId}</p>
      </div>

      {/* 캔버스 */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* 도구 바 */}
      <div className="bg-gray-800 p-4 space-y-4 shadow-lg">
        {/* 도구 선택 */}
        <div className="flex gap-2">
          <button
            onClick={() => setTool('pen')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
              tool === 'pen'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            🖊️ 펜
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
              tool === 'eraser'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            🧹 지우개
          </button>
        </div>

        {/* 색상 선택 */}
        {tool === 'pen' && (
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-bold">색상</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-12 h-12 rounded-lg transition-all ${
                    color === c ? 'ring-4 ring-blue-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 굵기 선택 */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 font-bold">
            굵기: {lineWidth}px
          </label>
          <div className="flex gap-2">
            {widths.map((w) => (
              <button
                key={w}
                onClick={() => setLineWidth(w)}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  lineWidth === w
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* 전체 지우기 */}
        <button
          onClick={clearCanvas}
          className="w-full py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-all"
        >
          🗑️ 전체 지우기
        </button>
      </div>
    </div>
  )
}
