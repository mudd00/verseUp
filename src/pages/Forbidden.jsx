import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <ShieldX className="w-24 h-24 text-red-400 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">접근 권한이 없습니다</h1>
        <p className="text-gray-400 mb-8">
          이 페이지는 관리자만 접근할 수 있습니다.
        </p>
        <Link
          to="/"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition inline-block"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
