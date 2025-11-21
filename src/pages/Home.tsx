import { Link } from 'react-router-dom'
import { ROUTES } from '@/utils/constants'

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
        VerseUp!
      </h1>
      <p className="text-2xl text-gray-300 mb-12 text-center max-w-2xl">
        편하게 놀고 소통하는 웹 메타버스 학습 플랫폼
      </p>

      <div className="flex gap-4">
        <Link
          to={ROUTES.COURSES}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition"
        >
          강의 둘러보기
        </Link>
        <Link
          to={ROUTES.LOGIN} // 로그인이 되지 않았다면 LOGIN으로 라우팅, 로그인이 되어있다면 METAVERSE로 라우팅
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold rounded-lg transition"
        >
          시작하기
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-3 text-blue-400">실시간 강의</h3>
          <p className="text-gray-400">
            WebRTC 기반 고품질 음성/영상 스트리밍으로 실제 강의실처럼 소통하세요
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-3 text-purple-400">메타버스 공간</h3>
          <p className="text-gray-400">
            아바타를 커스터마이즈하고 나만의 방에서 친구들과 함께 학습하세요
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-3 text-pink-400">협업 도구</h3>
          <p className="text-gray-400">
            화이트보드, 채팅, 과제 공유 등 다양한 협업 기능을 활용하세요
          </p>
        </div>
      </div>
    </div>
  )
}
