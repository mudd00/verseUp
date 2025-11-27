import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@/utils/constants.js'

export default function PaymentFail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const errorCode = searchParams.get('code')
  const errorMessage = searchParams.get('message')
  const orderId = searchParams.get('orderId')

  useEffect(() => {
    // 결제 실패 로그 기록 (선택사항)
    console.error('결제 실패:', {
      errorCode,
      errorMessage,
      orderId,
    })
  }, [errorCode, errorMessage, orderId])

  const getErrorMessage = () => {
    if (errorMessage) {
      return errorMessage
    }

    switch (errorCode) {
      case 'USER_CANCEL':
        return '사용자가 결제를 취소했습니다.'
      case 'INVALID_CARD':
        return '유효하지 않은 카드 정보입니다.'
      case 'EXCEED_MAX_AMOUNT':
        return '결제 한도를 초과했습니다.'
      case 'INSUFFICIENT_BALANCE':
        return '잔액이 부족합니다.'
      default:
        return '결제 처리 중 오류가 발생했습니다.'
    }
  }

  const handleRetry = () => {
    navigate(-2) // 결제 페이지로 돌아가기
  }

  const handleGoToCourses = () => {
    navigate(ROUTES.COURSES)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2">결제에 실패했습니다</h1>
        <p className="text-gray-400">{getErrorMessage()}</p>
      </div>

      {/* 실패 정보 */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">실패 정보</h2>
        <div className="space-y-3">
          {orderId && (
            <div className="flex justify-between">
              <span className="text-gray-400">주문번호</span>
              <span className="font-mono text-sm">{orderId}</span>
            </div>
          )}
          {errorCode && (
            <div className="flex justify-between">
              <span className="text-gray-400">오류 코드</span>
              <span className="font-mono text-sm text-red-400">{errorCode}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">실패 시각</span>
            <span className="font-medium">{new Date().toLocaleString('ko-KR')}</span>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-yellow-900/20 border border-yellow-600 p-4 rounded-lg mb-6">
        <p className="text-yellow-400 text-sm">
          ⚠️ 결제가 정상적으로 처리되지 않았습니다. 문제가 지속되면 고객센터로 문의해주세요.
        </p>
      </div>

      {/* 버튼 */}
      <div className="flex gap-4">
        <button
          onClick={handleGoToCourses}
          className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition"
        >
          강의 목록으로
        </button>
        <button
          onClick={handleRetry}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
