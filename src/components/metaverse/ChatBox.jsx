import { useRef, useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

/**
 * 게임 스타일 채팅 박스 컴포넌트
 * - 왼쪽 하단에 검은색 반투명 패널
 * - 메시지가 아래에서 위로 쌓임
 * - Enter로 입력창 활성화
 * - ESC로 입력 취소
 * - 30초 후 메시지 페이드 아웃
 */
export default function ChatBox({
  messages,
  isInputActive,
  inputText,
  messagesEndRef,
  onInputChange,
  onSendMessage,
  onActivateInput,
  onDeactivateInput,
}) {
  const inputRef = useRef(null)
  const chatContainerRef = useRef(null)
  const { user } = useAuthStore()
  const [currentTime, setCurrentTime] = useState(Date.now())

  // 입력창 활성화 시 포커스
  useEffect(() => {
    if (isInputActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isInputActive])

  // 새 메시지 시 스크롤 아래로
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // 메시지 페이드 아웃을 위해 1초마다 현재 시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 채팅 입력 중일 때는 게임 키 입력 차단
      if (isInputActive) {
        const gameKeys = ['KeyF', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Tab']
        if (gameKeys.includes(e.code)) {
          e.stopPropagation()
        }
      }

      // Enter 키
      if (e.key === 'Enter') {
        if (!isInputActive) {
          e.preventDefault()
          onActivateInput()
        } else if (inputText.trim()) {
          e.preventDefault()
          onSendMessage()
        } else {
          e.preventDefault()
          onDeactivateInput()
        }
      }

      // ESC 키
      if (e.key === 'Escape' && isInputActive) {
        e.preventDefault()
        onDeactivateInput()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInputActive, inputText, onActivateInput, onSendMessage, onDeactivateInput])

  // 메시지 opacity 계산 (30초 후부터 페이드 아웃)
  const getMessageOpacity = (timestamp) => {
    const messageTime = new Date(timestamp).getTime()
    const elapsed = (currentTime - messageTime) / 1000

    if (elapsed < 30) return 1
    if (elapsed > 35) return 0

    return 1 - (elapsed - 30) / 5
  }

  // 보이는 메시지만 필터링
  const visibleMessages = messages.filter((msg) => getMessageOpacity(msg.timestamp) > 0)

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {/* 채팅 패널 */}
      <div
        style={{
          width: '360px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        {/* 메시지 영역 */}
        <div
          ref={chatContainerRef}
          className="pointer-events-none"
          style={{
            height: '180px',
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
        >
          <style>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {visibleMessages.length === 0 && !isInputActive && (
            <div className="text-gray-500 text-xs text-center py-4">
              <span className="text-yellow-500 font-bold">Enter</span> 키를 눌러 채팅
            </div>
          )}

          {visibleMessages.map((msg) => {
            const isSystemMessage = msg.type === 'system'
            const isMyMessage = msg.userId === user?.id
            const opacity = getMessageOpacity(msg.timestamp)

            // 시스템 메시지
            if (isSystemMessage) {
              return (
                <div
                  key={msg.id}
                  className="py-0.5"
                  style={{ opacity, transition: 'opacity 1s ease-out' }}
                >
                  <span className="text-xs text-emerald-400 italic">
                    ※ {msg.message}
                  </span>
                </div>
              )
            }

            // 일반 메시지
            return (
              <div
                key={msg.id}
                className="py-0.5"
                style={{ opacity, transition: 'opacity 1s ease-out' }}
              >
                <span
                  className="text-xs font-bold"
                  style={{ color: isMyMessage ? '#60a5fa' : '#fbbf24' }}
                >
                  {msg.userName}
                </span>
                <span className="text-xs text-gray-400 mx-1">:</span>
                <span className="text-xs text-white break-words">
                  {msg.message}
                </span>
              </div>
            )
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <div
          className="pointer-events-auto"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '8px 12px',
            backgroundColor: isInputActive ? 'rgba(0, 0, 0, 0.4)' : 'transparent',
          }}
        >
          {isInputActive ? (
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="메시지 입력... (Enter로 전송, ESC로 취소)"
              className="w-full bg-transparent text-white text-xs outline-none placeholder-gray-500"
              maxLength={500}
              style={{ caretColor: '#60a5fa' }}
            />
          ) : (
            <div
              className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 transition-colors"
              onClick={onActivateInput}
            >
              Enter 키를 눌러 채팅...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
