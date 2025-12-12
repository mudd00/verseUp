import { useState, useEffect } from 'react'
import { Search, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function PaymentManagement() {
  const [tab, setTab] = useState('payments') // 'payments' or 'refunds'
  const [payments, setPayments] = useState([])
  const [refunds, setRefunds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (tab === 'payments') {
      loadPayments()
    } else {
      loadRefunds()
    }
  }, [tab, page, search])

  const loadPayments = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
      })

      const response = await fetch(`/api/admin/payments?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }

      const data = await response.json()
      setPayments(data.payments || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('결제 목록 로드 실패:', error)
      toast.error('결제 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRefunds = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/refunds', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch refunds')
      }

      const data = await response.json()
      setRefunds(data.refunds || [])
    } catch (error) {
      console.error('환불 목록 로드 실패:', error)
      toast.error('환불 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefundAction = async (refundId, action) => {
    try {
      const response = await fetch(`/api/admin/refunds/${refundId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} refund`)
      }

      toast.success(
        action === 'approve' ? '환불이 승인되었습니다.' : '환불이 거부되었습니다.'
      )
      loadRefunds()
    } catch (error) {
      console.error(`환불 ${action} 실패:`, error)
      toast.error(`환불 ${action === 'approve' ? '승인' : '거부'}에 실패했습니다.`)
    }
  }

  const totalRevenue = payments
    .filter((p) => p.status === 'DONE')
    .reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalRefunded = refunds
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (r.amount || 0), 0)

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">결제 및 환불 관리</h1>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">총 매출</p>
          <p className="text-2xl font-bold text-green-400">
            ₩{totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">총 환불액</p>
          <p className="text-2xl font-bold text-red-400">
            ₩{totalRefunded.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">순수익</p>
          <p className="text-2xl font-bold text-blue-400">
            ₩{(totalRevenue - totalRefunded).toLocaleString()}
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-gray-800 rounded-lg mb-6">
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => {
              setTab('payments')
              setPage(1)
            }}
            className={`flex-1 px-6 py-3 font-medium transition ${
              tab === 'payments'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            결제 내역
          </button>
          <button
            onClick={() => {
              setTab('refunds')
              setPage(1)
            }}
            className={`flex-1 px-6 py-3 font-medium transition ${
              tab === 'refunds'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            환불 관리
          </button>
        </div>
      </div>

      {/* 결제 테이블 */}
      {tab === 'payments' && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    주문번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    강의
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    금액
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    결제일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      로딩 중...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      결제 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono">
                          {payment.order_id || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {payment.user?.name || payment.user_id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {payment.course?.title || payment.course_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold">
                          ₩{payment.amount?.toLocaleString() || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">
                          {payment.created_at
                            ? format(new Date(payment.created_at), 'yyyy-MM-dd HH:mm')
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.status === 'DONE'
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-yellow-600/20 text-yellow-400'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 환불 테이블 */}
      {tab === 'refunds' && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    강의
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    환불액
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    요청일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      로딩 중...
                    </td>
                  </tr>
                ) : refunds.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      환불 요청이 없습니다.
                    </td>
                  </tr>
                ) : (
                  refunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">{refund.user?.name || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{refund.course?.title || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold">
                          ₩{refund.amount?.toLocaleString() || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">
                          {refund.created_at
                            ? format(new Date(refund.created_at), 'yyyy-MM-dd')
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            refund.status === 'pending'
                              ? 'bg-yellow-600/20 text-yellow-400'
                              : refund.status === 'approved'
                                ? 'bg-green-600/20 text-green-400'
                                : 'bg-red-600/20 text-red-400'
                          }`}
                        >
                          {refund.status === 'pending'
                            ? '대기 중'
                            : refund.status === 'approved'
                              ? '승인됨'
                              : '거부됨'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {refund.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRefundAction(refund.id, 'approve')}
                              className="p-1 hover:bg-gray-600 rounded transition"
                              title="승인"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                            </button>
                            <button
                              onClick={() => handleRefundAction(refund.id, 'reject')}
                              className="p-1 hover:bg-gray-600 rounded transition"
                              title="거부"
                            >
                              <X className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
