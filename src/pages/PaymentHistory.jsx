import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '@/services/api.js'
import { ROUTES } from '@/utils/constants.js'
import { useAuthStore } from '@/stores/authStore.js'
import toast from 'react-hot-toast'

export default function PaymentHistory() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [payments, setPayments] = useState([])
  const [refunds, setRefunds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('payments') // 'payments' | 'refunds'

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadPayments()
    loadRefunds()
  }, [])

  const loadPayments = async () => {
    try {
      setIsLoading(true)
      // 관리자는 모든 결제 내역, 학생은 자신의 결제 내역만 조회
      const endpoint = isAdmin ? '/admin/payments' : '/payments'
      const response = await apiService.get(endpoint)
      setPayments(response.payments || [])
    } catch (error) {
      console.error('결제 내역 조회 실패:', error)
      toast.error('결제 내역을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRefunds = async () => {
    try {
      // 관리자는 모든 환불 내역, 학생은 자신의 환불 내역만 조회
      const endpoint = isAdmin ? '/admin/payments/refunds' : '/payments/refunds'
      const response = await apiService.get(endpoint)
      setRefunds(response.refunds || [])
    } catch (error) {
      console.error('환불 내역 조회 실패:', error)
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
      failed: { label: '실패', color: 'bg-red-700' },
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
        <h1 className="text-3xl font-bold mb-2">결제 및 환불 내역</h1>
        <p className="text-gray-400">
          {isAdmin ? '모든 사용자의 결제 및 환불 내역을 확인할 수 있습니다.' : '결제 및 환불 내역을 확인할 수 있습니다.'}
        </p>
      </div>

      {/* 탭 메뉴 */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'payments'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          결제 내역 ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'refunds'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          환불 내역 ({refunds.length})
        </button>
      </div>

      {/* 결제 내역 탭 */}
      {activeTab === 'payments' && (
        <>
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
                {isAdmin && <th className="px-6 py-4 text-left text-sm font-semibold">사용자</th>}
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
                <tr key={payment.orderId || payment.order_id} className="hover:bg-gray-700/50 transition">
                  {isAdmin && (
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <div className="font-medium">{payment.user?.name || '-'}</div>
                        <div className="text-xs text-gray-400">{payment.user?.email || '-'}</div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm font-mono text-gray-400">
                    {payment.orderId || payment.order_id}
                  </td>
                  <td className="px-6 py-4 text-sm">{payment.orderName || payment.order_name || '-'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-400">
                    ₩{payment.amount?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">{payment.method || '카드'}</td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(payment.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {formatDate(payment.approvedAt || payment.approved_at)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {(payment.receipt || payment.receipt_url) ? (
                      <a
                        href={payment.receipt || payment.receipt_url}
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
        </>
      )}

      {/* 환불 내역 탭 */}
      {activeTab === 'refunds' && (
        <>
          {refunds.length === 0 ? (
            <div className="bg-gray-800 p-12 rounded-lg text-center">
              <p className="text-gray-400">환불 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    {isAdmin && <th className="px-6 py-4 text-left text-sm font-semibold">사용자</th>}
                    <th className="px-6 py-4 text-left text-sm font-semibold">주문번호</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">강의명</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">원금액</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">환불금액</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">환불율</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">환불정책</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">상태</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">환불일시</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {refunds.map((refund) => (
                    <tr key={refund.refundId || refund.id} className="hover:bg-gray-700/50 transition">
                      {isAdmin && (
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <div className="font-medium">{refund.user?.name || '-'}</div>
                            <div className="text-xs text-gray-400">{refund.user?.email || '-'}</div>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm font-mono text-gray-400">
                        {refund.orderId || refund.payment?.order_id || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">{refund.courseTitle || refund.course?.title || refund.orderName || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        ₩{(refund.originalAmount || refund.original_amount)?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-400">
                        ₩{(refund.refundAmount || refund.refund_amount)?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-400">
                        {refund.refundRate || refund.refund_rate}%
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {refund.policyApplied || refund.policy_applied || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">{getStatusBadge(refund.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDate(refund.completedAt || refund.completed_at || refund.requestedAt || refund.requested_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
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
