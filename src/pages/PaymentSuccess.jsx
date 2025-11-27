import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiService } from '@/services/api.js'
import { ROUTES } from '@/utils/constants.js'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(true)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const hasVerified = useRef(false)

  const orderId = searchParams.get('orderId')
  const paymentKey = searchParams.get('paymentKey')
  const amount = searchParams.get('amount')

  useEffect(() => {
    if (!orderId || !paymentKey || !amount) {
      toast.error('잘못된 결제 정보입니다.')
      navigate(ROUTES.COURSES)
      return
    }

    // 중복 실행 방지
    if (hasVerified.current) {
      return
    }
    hasVerified.current = true

    verifyPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verifyPayment = async () => {
    try {
      setIsProcessing(true)

      // 백엔드에서 결제 승인 및 검증
      const response = await apiService.post('/api/payments/confirm', {
        orderId,
        paymentKey,
        amount: parseInt(amount),
      })

      setPaymentInfo(response)

      // 수강 신청 성공 메시지
      if (response.enrolled && response.courseId) {
        toast.success('결제 및 수강 신청이 완료되었습니다! 🎉')
      } else {
        toast.success('결제가 완료되었습니다!')
      }
    } catch (error) {
      console.error('결제 검증 실패:', error)
      toast.error('결제 검증에 실패했습니다.')
      navigate(ROUTES.COURSES)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGoToDashboard = () => {
    navigate(ROUTES.DASHBOARD)
  }

  const handleGoToCourses = () => {
    navigate(ROUTES.COURSES)
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400">결제를 확인하는 중...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-10 h-10 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2">결제가 완료되었습니다!</h1>
        <p className="text-gray-400">수강 신청이 정상적으로 처리되었습니다.</p>
      </div>

      {/* 결제 정보 */}
      {paymentInfo && (
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">결제 내역</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">주문번호</span>
              <span className="font-mono text-sm">{paymentInfo.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">강의명</span>
              <span className="font-medium">{paymentInfo.orderName || '강의 수강료'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">결제수단</span>
              <span className="font-medium">{paymentInfo.method || '카드'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">결제금액</span>
              <span className="font-medium text-blue-400">
                ₩{parseInt(paymentInfo.amount || amount).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">결제일시</span>
              <span className="font-medium">
                {new Date(paymentInfo.approvedAt || Date.now()).toLocaleString('ko-KR')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="bg-blue-900/20 border border-blue-600 p-4 rounded-lg mb-6">
        <div className="space-y-2">
          {paymentInfo?.enrolled && (
            <p className="text-green-400 text-sm font-semibold">
              ✅ 수강 신청이 자동으로 완료되었습니다!
            </p>
          )}
          <p className="text-blue-400 text-sm">
            ℹ️ 대시보드에서 수강 중인 강의를 확인하실 수 있습니다.
          </p>
        </div>
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
          onClick={handleGoToDashboard}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
        >
          대시보드로 이동
        </button>
      </div>
    </div>
  )
}
