import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import toast from 'react-hot-toast'
import { courseService } from '@/services/courseService.js'
import { useAuthStore } from '@/stores/authStore.js'

const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY

export default function Payment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()

  const courseId = searchParams.get('courseId')
  const amount = searchParams.get('amount')
  const courseName = searchParams.get('courseName')

  const [course, setCourse] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tossPayments, setTossPayments] = useState(null)

  useEffect(() => {
    if (!courseId || !amount || !user) {
      toast.error('잘못된 접근입니다.')
      navigate('/courses')
      return
    }

    loadCourse()
    initializeTossPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, amount, user])

  const loadCourse = async () => {
    try {
      const data = await courseService.getCourseById(courseId)
      setCourse(data)
    } catch (err) {
      console.error('강의 조회 실패:', err)
      toast.error('강의 정보를 불러오는데 실패했습니다.')
      navigate('/courses')
    }
  }

  const initializeTossPayments = async () => {
    try {
      const tossPaymentsInstance = await loadTossPayments(clientKey)
      setTossPayments(tossPaymentsInstance)
      setIsLoading(false)
    } catch (error) {
      console.error('토스페이먼츠 초기화 실패:', error)
      toast.error('결제 시스템을 불러오는데 실패했습니다.')
      setIsLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!tossPayments) {
      toast.error('결제 시스템이 준비되지 않았습니다.')
      return
    }

    try {
      // 결제창 생성
      const payment = tossPayments.payment({ customerKey: user.id })

      // 결제 요청 (카드 결제)
      await payment.requestPayment({
        method: 'CARD',
        amount: {
          currency: 'KRW',
          value: parseInt(amount),
        },
        orderId: `ORDER_${courseId}_${Date.now()}`,
        orderName: courseName || course?.title || '강의 수강료',
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email,
        customerName: user.name,
      })
    } catch (error) {
      console.error('결제 요청 실패:', error)
      if (error.code === 'USER_CANCEL') {
        toast.error('결제를 취소하셨습니다.')
      } else {
        toast.error('결제 요청에 실패했습니다.')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">결제 시스템을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">결제하기</h1>
        <p className="text-gray-400">결제 버튼을 클릭하면 결제창이 팝업으로 표시됩니다.</p>
      </div>

      {/* 주문 정보 */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">주문 정보</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">강의명</span>
            <span className="font-medium">{courseName || course?.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">수강료</span>
            <span className="font-medium text-blue-400">₩{parseInt(amount).toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="flex justify-between text-lg">
              <span className="font-semibold">총 결제금액</span>
              <span className="font-bold text-blue-400">
                ₩{parseInt(amount).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 결제 안내 */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">결제 방법</h2>
        <div className="space-y-3 text-gray-300">
          <p>• 결제 버튼을 클릭하면 토스페이먼츠 결제창이 팝업으로 열립니다.</p>
          <p>• 카드, 계좌이체, 간편결제 등 다양한 결제 수단을 선택할 수 있습니다.</p>
          <p>• 결제 완료 후 자동으로 수강 신청이 처리됩니다.</p>
        </div>
      </div>

      {/* 결제 버튼 */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition"
        >
          취소
        </button>
        <button
          onClick={handlePayment}
          className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
        >
          결제하기
        </button>
      </div>

      {/* 테스트 모드 안내 */}
      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
        <p className="text-yellow-400 text-sm">
          ⚠️ 현재 테스트 모드입니다. 실제 결제가 진행되지 않으며, 테스트용 카드 정보를 사용할 수
          있습니다.
        </p>
      </div>
    </div>
  )
}
