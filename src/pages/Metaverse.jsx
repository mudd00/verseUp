import { useState } from 'react'
import MetaverseScene from '@/components/metaverse/MetaverseScene.jsx'

export default function Metaverse() {
  const [isReady, setIsReady] = useState(false)

  return (
    <div className="relative w-full h-screen">
      <MetaverseScene onReady={() => setIsReady(true)} />

      <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg backdrop-blur-sm max-w-xs">
        <h2 className="text-xl font-bold mb-3">VerseUp! 메타버스</h2>
        <div className="text-sm space-y-1">
          <p className="font-semibold text-blue-300">이동</p>
          <p className="ml-4">W/A/S/D 또는 방향키</p>
          <p className="font-semibold text-blue-300 mt-2">⬆️ 점프</p>
          <p className="ml-4">Space</p>
          <p className="font-semibold text-blue-300 mt-2">카메라</p>
          <p className="ml-4">화면 클릭: 마우스 락</p>
          <p className="ml-4">마우스 이동: 카메라 회전</p>
          <p className="ml-4">마우스 휠: 줌 인/아웃</p>
          <p className="ml-4">ESC: 마우스 락 해제</p>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-400">
          <p>힌트: F12 → Console에서 로딩 정보를 확인하세요</p>
        </div>
      </div>

      {!isReady && (
        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm">
          <p>모델 로딩 중... (50MB, 다소 시간이 걸릴 수 있습니다)</p>
        </div>
      )}

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4 mx-auto"></div>
            <p className="text-white text-xl mb-2">메타버스 로딩 중...</p>
            <p className="text-gray-400 text-sm">대용량 리소스 불러오는 중(50MB)</p>
            <p className="text-gray-400 text-sm">잠시만 기다려주세요...</p>
          </div>
        </div>
      )}
    </div>
  )
}
