import { useState, useEffect, useCallback, useRef } from 'react'
import { socketService } from '../services/socket'

/**
 * 게임 스타일 텍스트 채팅 훅
 * @param {string} roomId - 현재 방 ID
 * @param {boolean} isInSchool - 학교 맵에 있는지 여부
 * @returns {Object} 채팅 상태와 메서드
 */
export function useChat(roomId, isInSchool) {
  const [messages, setMessages] = useState([])
  const [isInputActive, setIsInputActive] = useState(false) // 입력창 활성화 여부
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)

  // 메시지 수신 핸들러 - 의존성 없이 setMessages 직접 사용
  const handleChatMessage = useCallback((message) => {
    console.log('💬 [Chat] Message received:', message)
    setMessages((prev) => {
      const newMessages = [...prev, message]
      return newMessages.slice(-8)
    })
  }, [])

  // 시스템 메시지 추가 - 의존성 없이 setMessages 직접 사용
  const addSystemMessage = useCallback((text) => {
    const systemMessage = {
      id: `system-${Date.now()}`,
      type: 'system',
      message: text,
      timestamp: new Date().toISOString(),
    }
    console.log('💬 [Chat] System message:', text)
    setMessages((prev) => {
      const newMessages = [...prev, systemMessage]
      return newMessages.slice(-8)
    })
  }, [])

  // 사용자 퇴장 핸들러 - 의존성 없이 setMessages 직접 사용
  const handleUserLeft = useCallback(({ user }) => {
    const text = user?.name
      ? `${user.name}님이 퇴장하셨습니다.`
      : `누군가가 퇴장하셨습니다.`
    const systemMessage = {
      id: `system-${Date.now()}`,
      type: 'system',
      message: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => {
      const newMessages = [...prev, systemMessage]
      return newMessages.slice(-8)
    })
  }, [])

  // 위치 변경 핸들러 (학교/강의실 입장) - 의존성 없이 setMessages 직접 사용
  const handleLocationEntered = useCallback((data) => {
    console.log('💬 [Chat] location:entered received:', data)
    const { userName, locationName } = data
    if (userName && locationName) {
      const systemMessage = {
        id: `system-${Date.now()}`,
        type: 'system',
        message: `${userName}님이 ${locationName}에 입장하셨습니다.`,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => {
        const newMessages = [...prev, systemMessage]
        return newMessages.slice(-8)
      })
    }
  }, [])

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!isInSchool || !roomId) return

    console.log('💬 [Chat] Setting up chat for room:', roomId)

    socketService.on('chat:message', handleChatMessage)
    socketService.on('room:user-left', handleUserLeft)
    socketService.on('location:entered', handleLocationEntered)

    console.log('💬 [Chat] All listeners registered')

    return () => {
      // callback 참조로 해당 핸들러만 제거 (다른 컴포넌트의 핸들러는 유지)
      socketService.off('chat:message', handleChatMessage)
      socketService.off('room:user-left', handleUserLeft)
      socketService.off('location:entered', handleLocationEntered)
      console.log('💬 [Chat] Cleanup')
    }
  }, [isInSchool, roomId, handleChatMessage, handleUserLeft, handleLocationEntered])

  // 새 메시지가 오면 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 메시지 전송
  const sendMessage = useCallback(() => {
    if (!inputText.trim()) {
      console.log('💬 [Chat] Empty message, not sending')
      return
    }

    if (!roomId) {
      console.error('💬 [Chat] No roomId, cannot send message')
      return
    }

    const socket = socketService.getSocket()
    if (!socket?.connected) {
      console.error('💬 [Chat] Socket not connected, cannot send message')
      return
    }

    console.log('💬 [Chat] Sending message to room:', roomId, '| Message:', inputText)
    socketService.emit('chat:message', {
      roomId,
      message: inputText.trim(),
    })

    // 입력창 초기화 및 비활성화
    setInputText('')
    setIsInputActive(false)
  }, [inputText, roomId])

  // 입력창 활성화
  const activateInput = useCallback(() => {
    console.log('💬 [Chat] Input activated')
    setIsInputActive(true)
  }, [])

  // 입력창 비활성화 (취소)
  const deactivateInput = useCallback(() => {
    setIsInputActive(false)
    setInputText('')
  }, [])

  // 입력 텍스트 변경
  const handleInputChange = useCallback((text) => {
    setInputText(text)
  }, [])

  return {
    messages,
    isInputActive,
    inputText,
    messagesEndRef,
    sendMessage,
    activateInput,
    deactivateInput,
    handleInputChange,
  }
}
