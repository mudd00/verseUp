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

  // 메시지 추가 함수 (공통)
  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      // 최근 8개 메시지만 유지
      const newMessages = [...prev, message]
      return newMessages.slice(-8)
    })
  }, [])

  // 시스템 메시지 추가 (입장/퇴장 등)
  const addSystemMessage = useCallback((text) => {
    const systemMessage = {
      id: `system-${Date.now()}`,
      type: 'system',
      message: text,
      timestamp: new Date().toISOString(),
    }
    console.log('💬 [Chat] System message:', text)
    addMessage(systemMessage)
  }, [addMessage])

  // 메시지 수신 핸들러
  const handleChatMessage = useCallback((message) => {
    console.log('💬 [Chat] Message received:', message)
    addMessage(message)
  }, [addMessage])

  // 사용자 입장 핸들러
  const handleUserJoined = useCallback(({ user }) => {
    if (user?.name) {
      addSystemMessage(`${user.name}님이 입장하셨습니다.`)
    }
  }, [addSystemMessage])

  // 사용자 퇴장 핸들러
  const handleUserLeft = useCallback(({ user }) => {
    if (user?.name) {
      addSystemMessage(`${user.name}님이 퇴장하셨습니다.`)
    } else {
      addSystemMessage(`누군가가 퇴장하셨습니다.`)
    }
  }, [addSystemMessage])

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!isInSchool || !roomId) return

    console.log('💬 [Chat] Setting up chat for room:', roomId)

    socketService.on('chat:message', handleChatMessage)
    socketService.on('room:user-joined', handleUserJoined)
    socketService.on('room:user-left', handleUserLeft)

    return () => {
      socketService.off('chat:message', handleChatMessage)
      socketService.off('room:user-joined', handleUserJoined)
      socketService.off('room:user-left', handleUserLeft)
      console.log('💬 [Chat] Cleanup')
    }
  }, [isInSchool, roomId, handleChatMessage, handleUserJoined, handleUserLeft])

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
