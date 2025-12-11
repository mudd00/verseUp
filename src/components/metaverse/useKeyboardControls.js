import { useState, useEffect } from 'react'

export function useKeyboardControls(isInputDisabled = false) {
  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    shift: false,
    log: false,
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 채팅 입력 중이면 게임 키 입력 무시
      if (isInputDisabled) return

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys((prev) => ({ ...prev, forward: true }))
          break
        case 'KeyS':
        case 'ArrowDown':
          setKeys((prev) => ({ ...prev, backward: true }))
          break
        case 'KeyA':
        case 'ArrowLeft':
          setKeys((prev) => ({ ...prev, left: true }))
          break
        case 'KeyD':
        case 'ArrowRight':
          setKeys((prev) => ({ ...prev, right: true }))
          break
        case 'Space':
          setKeys((prev) => ({ ...prev, jump: true }))
          e.preventDefault()
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          setKeys((prev) => ({ ...prev, shift: true }))
          break
        case 'KeyC':
          setKeys((prev) => ({ ...prev, log: true }))
          break
      }
    }

    const handleKeyUp = (e) => {
      // 채팅 입력 중이면 게임 키 입력 무시
      if (isInputDisabled) return

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys((prev) => ({ ...prev, forward: false }))
          break
        case 'KeyS':
        case 'ArrowDown':
          setKeys((prev) => ({ ...prev, backward: false }))
          break
        case 'KeyA':
        case 'ArrowLeft':
          setKeys((prev) => ({ ...prev, left: false }))
          break
        case 'KeyD':
        case 'ArrowRight':
          setKeys((prev) => ({ ...prev, right: false }))
          break
        case 'Space':
          setKeys((prev) => ({ ...prev, jump: false }))
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          setKeys((prev) => ({ ...prev, shift: false }))
          break
        case 'KeyC':
          setKeys((prev) => ({ ...prev, log: false }))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isInputDisabled])

  return keys
}
