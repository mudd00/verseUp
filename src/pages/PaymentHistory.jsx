import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '@/services/api.js'
import { ROUTES } from '@/utils/constants.js'
import toast from 'react-hot-toast'

export default function PaymentHistory() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.get('/api/payments')
      setPayments(response.payments || [])
    } catch (error) {
      console.error('결제 내역 조회 실패:', error)
      toast.error('결제 내역을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      completed: { label: '완료', color: 'bg-green-600' },
      pending: { label: '대기', color: 'bg-yellow-600' },
      cancelled: { label: '취소', color: 'bg-red-600' },
    }
    const badge = badges[status] || badges.completed
    return (
      <span className={`px-3 py-1 text-sm rounded-full ${badge.color} text-white`}>
        {badge.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">결제 내역을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">결제 내역</h1>
        <p className="text-gray-400">모든 결제 내역을 확인할 수 있습니다.</p>
      </div>

      {payments.length === 0 ? (
        <div className="bg-gray-800 p-12 rounded-lg text-center">
          <p className="text-gray-400 mb-4">결제 내역이 없습니다.</p>
          <button
            onClick={() => navigate(ROUTES.COURSES)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            강의 둘러보기
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">주문번호</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">강의명</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">결제금액</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">결제수단</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">상태</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">결제일시</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">영수증</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {payments.map((payment) => (
                <tr key={payment.orderId} className="hover:bg-gray-700/50 transition">
                  <td className="px-6 py-4 text-sm font-mono text-gray-400">
                    {payment.orderId}
                  </td>
                  <td className="px-6 py-4 text-sm">{payment.orderName || '-'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-400">
                    ₩{payment.amount?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">{payment.method || '카드'}</td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(payment.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {formatDate(payment.approvedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {payment.receipt ? (
                      <a
                        href={payment.receipt}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        보기
                      </a>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
        <p className="text-blue-400 text-sm">
          ℹ️ 결제 관련 문의사항은 고객센터로 연락해주세요.
        </p>
      </div>
    </div>
  )
}
