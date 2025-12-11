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

  // 메시지 수신 핸들러
  const handleChatMessage = useCallback((message) => {
    console.log('💬 [Chat] Message received:', message)
    setMessages((prev) => {
      // 최근 8개 메시지만 유지
      const newMessages = [...prev, message]
      return newMessages.slice(-8)
    })
  }, [])

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!isInSchool || !roomId) return

    console.log('💬 [Chat] Setting up chat for room:', roomId)

    socketService.on('chat:message', handleChatMessage)

    return () => {
      socketService.off('chat:message', handleChatMessage)
      console.log('💬 [Chat] Cleanup')
    }
  }, [isInSchool, roomId, handleChatMessage])

  // 새 메시지가 오면 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 메시지 전송
  const sendMessage = useCallback(() => {
    if (!inputText.trim() || !roomId) return

    console.log('💬 [Chat] Sending message:', inputText)
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
