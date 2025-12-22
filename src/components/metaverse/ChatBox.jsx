import { useRef, useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

/**
 * 게임 스타일 채팅 박스 컴포넌트
 * - 왼쪽 하단에 항상 표시
 * - Enter로 입력창 활성화
 * - ESC로 입력 취소
 * - 투명한 배경
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
  const { user } = useAuthStore()
  const [currentTime, setCurrentTime] = useState(Date.now())

  // 입력창 활성화 시 포커스
  useEffect(() => {
    if (isInputActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isInputActive])

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
      // 채팅 입력 중일 때는 게임 키 입력 차단 (F, WASD, Shift, Tab 등)
      if (isInputActive) {
        const gameKeys = ['KeyF', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Tab']
        if (gameKeys.includes(e.code)) {
          e.stopPropagation() // 이벤트 전파 차단
        }
      }

      // Enter 키: 입력창 활성화, 메시지 전송, 또는 입력창 닫기
      if (e.key === 'Enter') {
        if (!isInputActive) {
          // 입력창이 비활성 상태면 활성화
          e.preventDefault()
          onActivateInput()
        } else if (inputText.trim()) {
          // 텍스트가 있으면 전송
          e.preventDefault()
          onSendMessage()
        } else {
          // 텍스트가 없으면 입력창 닫기
          e.preventDefault()
          onDeactivateInput()
        }
      }

      // ESC 키: 입력 취소
      if (e.key === 'Escape' && isInputActive) {
        e.preventDefault()
        onDeactivateInput()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInputActive, inputText, onActivateInput, onSendMessage, onDeactivateInput])

  // 시간 포맷팅 (HH:MM)
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  // 메시지 opacity 계산 (30초 후부터 페이드 아웃)
  const getMessageOpacity = (timestamp) => {
    const messageTime = new Date(timestamp).getTime()
    const elapsed = (currentTime - messageTime) / 1000 // 초 단위

    if (elapsed < 30) return 1 // 30초 이전: 완전 불투명
    if (elapsed > 35) return 0 // 35초 이후: 완전 투명

    // 30~35초: 점진적 페이드 (1 → 0)
    return 1 - (elapsed - 30) / 5
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 pointer-events-none">
      {/* 메시지 목록 (항상 표시) */}
      <div className="w-96 mb-2">
        {messages.length > 0 && (
          <div className="space-y-1">
            {messages
              .filter((msg) => getMessageOpacity(msg.timestamp) > 0) // opacity 0인 메시지 제외
              .map((msg) => {
                const isSystemMessage = msg.type === 'system'
                const isMyMessage = msg.userId === user?.id
                const opacity = getMessageOpacity(msg.timestamp)

                // 시스템 메시지 (입장/퇴장 등)
                if (isSystemMessage) {
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-center animate-fadeIn"
                      style={{
                        animation: 'fadeIn 0.3s ease-in',
                        opacity: opacity,
                        transition: 'opacity 1s ease-out',
                      }}
                    >
                      <div
                        className="px-4 py-1.5 rounded-full text-center"
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.25)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        <span className="text-xs text-emerald-300 italic">
                          {msg.message}
                        </span>
                      </div>
                    </div>
                  )
                }

                // 일반 채팅 메시지
                return (
                  <div
                    key={msg.id}
                    className="flex flex-col animate-fadeIn"
                    style={{
                      animation: 'fadeIn 0.3s ease-in',
                      opacity: opacity,
                      transition: 'opacity 1s ease-out',
                    }}
                  >
                    {/* 메시지 버블 */}
                    <div
                      className="px-3 py-2 rounded-md max-w-full"
                      style={{
                        backgroundColor: isMyMessage
                          ? 'rgba(59, 130, 246, 0.85)'
                          : 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                    {/* 발신자 이름 & 시간 */}
                    <div className="flex items-baseline gap-2 mb-1">
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: isMyMessage ? '#bfdbfe' : '#fbbf24',
                        }}
                      >
                        {msg.userName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    {/* 메시지 내용 */}
                    <p className="text-sm text-white break-words whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  </div>
                </div>
              )
            })}
            {/* 자동 스크롤 앵커 */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 입력창 (활성화 시에만 표시) */}
      {isInputActive && (
        <div
          className="w-96 pointer-events-auto"
          style={{
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          <div
            className="px-3 py-2 rounded-md"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-400"
              maxLength={500}
              style={{
                caretColor: '#60a5fa',
              }}
            />
          </div>
        </div>
      )}

      {/* 도움말 (입력창이 비활성일 때만 표시, 메시지가 없을 때) */}
      {!isInputActive && messages.length === 0 && (
        <div
          className="text-xs text-gray-400 px-3 py-2 rounded-md"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span className="font-semibold text-yellow-400">Enter</span>를 눌러
          채팅 시작
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
