import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

const STATUS_LABELS = {
  active: '수강 중',
  dropped: '취소됨',
}

const STATUS_COLORS = {
  active: 'bg-green-600/20 text-green-400',
  dropped: 'bg-red-600/20 text-red-400',
}

export default function EnrollmentManagement() {
  const [enrollments, setEnrollments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadEnrollments()
  }, [page, search, statusFilter, startDate, endDate])

  const loadEnrollments = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })

      const response = await fetch(`/api/admin/enrollments?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch enrollments')
      }

      const data = await response.json()
      setEnrollments(data.enrollments || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('수강 목록 로드 실패:', error)
      toast.error('수강 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadEnrollments()
  }

  const cancelEnrollment = async (enrollmentId) => {
    if (!confirm('정말로 이 수강 신청을 취소하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to cancel enrollment')
      }

      toast.success('수강 신청이 취소되었습니다.')
      loadEnrollments()
    } catch (error) {
      console.error('수강 취소 실패:', error)
      toast.error('수강 취소에 실패했습니다.')
    }
  }

  const activeCount = enrollments.filter((e) => e.status === 'active').length
  const droppedCount = enrollments.filter((e) => e.status === 'dropped').length

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">수강 관리</h1>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">전체 수강 신청</p>
          <p className="text-2xl font-bold">{total}건</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">수강 중</p>
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">취소됨</p>
          <p className="text-2xl font-bold text-red-400">{droppedCount}</p>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="학생 또는 강의로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="active">수강 중</option>
              <option value="dropped">취소됨</option>
            </select>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              검색
            </button>
          </div>

          {/* 날짜 범위 필터 */}
          <div className="flex gap-4 items-center">
            <span className="text-sm text-gray-400">수강일 범위:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                  setPage(1)
                }}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
              >
                날짜 초기화
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 수강 테이블 */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  학생명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  강의명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  수강일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  결제 여부
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
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
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    수강 신청이 없습니다.
                  </td>
                </tr>
              ) : (
                enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {enrollment.student?.name || '-'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {enrollment.student?.email || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/courses/${enrollment.course_id}`}
                        className="text-sm hover:text-blue-400"
                      >
                        {enrollment.course?.title || '-'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {enrollment.created_at
                          ? format(new Date(enrollment.created_at), 'yyyy-MM-dd')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[enrollment.status] || 'bg-gray-600/20 text-gray-400'}`}
                      >
                        {STATUS_LABELS[enrollment.status] || enrollment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          !enrollment.course?.price || enrollment.course?.price === 0
                            ? 'bg-blue-600/20 text-blue-400'
                            : enrollment.payment_id
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-yellow-600/20 text-yellow-400'
                        }`}
                      >
                        {!enrollment.course?.price || enrollment.course?.price === 0
                          ? '무료'
                          : enrollment.payment_id
                            ? '결제 완료'
                            : '미결제'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {enrollment.status === 'active' && (
                        <button
                          onClick={() => cancelEnrollment(enrollment.id)}
                          className="p-1 hover:bg-gray-600 rounded transition"
                          title="수강 취소"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-700/50 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              전체 {total}건 중 {(page - 1) * 20 + 1}-
              {Math.min(page * 20, total)}건 표시
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="px-3 py-1 bg-gray-600 rounded">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
