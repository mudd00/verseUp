import { useState } from 'react'
import MetaverseScene from '@/components/metaverse/MetaverseScene.jsx'

export default function Metaverse() {
  const [isReady, setIsReady] = useState(false)

  return (
    <div className="relative w-full h-screen">
      <MetaverseScene onReady={() => setIsReady(true)} />

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
