import { useState, useEffect } from 'react'
import { Search, Eye, Check, X, Archive, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

const STATUS_LABELS = {
  draft: '초안',
  published: '공개',
  archived: '보관됨',
}

const STATUS_COLORS = {
  draft: 'bg-yellow-600/20 text-yellow-400',
  published: 'bg-green-600/20 text-green-400',
  archived: 'bg-gray-600/20 text-gray-400',
}

export default function CourseManagement() {
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [page, search, statusFilter])

  const loadCourses = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      })

      const response = await fetch(`/api/admin/courses?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }

      const data = await response.json()
      setCourses(data.courses || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('강의 목록 로드 실패:', error)
      toast.error('강의 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadCourses()
  }

  const updateCourseStatus = async (courseId, newStatus, reason = '') => {
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ status: newStatus, reason }),
      })

      if (!response.ok) {
        throw new Error('Failed to update course status')
      }

      toast.success('강의 상태가 변경되었습니다.')
      loadCourses()
      setShowRejectModal(false)
      setSelectedCourse(null)
      setRejectReason('')
    } catch (error) {
      console.error('강의 상태 변경 실패:', error)
      toast.error('강의 상태 변경에 실패했습니다.')
    }
  }

  const deleteCourse = async (courseId) => {
    if (
      !confirm(
        '정말로 이 강의를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete course')
      }

      toast.success('강의가 삭제되었습니다.')
      loadCourses()
    } catch (error) {
      console.error('강의 삭제 실패:', error)
      toast.error('강의 삭제에 실패했습니다.')
    }
  }

  const viewCourseDetail = async (courseId) => {
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch course detail')
      }

      const course = await response.json()
      setSelectedCourse(course)
    } catch (error) {
      console.error('강의 상세 조회 실패:', error)
      toast.error('강의 정보를 불러오는데 실패했습니다.')
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">강의 관리</h1>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">전체 강의</p>
          <p className="text-2xl font-bold">{total}개</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">초안</p>
          <p className="text-2xl font-bold text-yellow-400">
            {courses.filter((c) => c.status === 'draft').length}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">공개</p>
          <p className="text-2xl font-bold text-green-400">
            {courses.filter((c) => c.status === 'published').length}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">보관됨</p>
          <p className="text-2xl font-bold text-gray-400">
            {courses.filter((c) => c.status === 'archived').length}
          </p>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="강의명 또는 강사명으로 검색..."
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
            <option value="draft">초안</option>
            <option value="published">공개</option>
            <option value="archived">보관됨</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            검색
          </button>
        </form>
      </div>

      {/* 강의 테이블 */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  강의명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  강사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  수강인원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  생성일
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
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    강의가 없습니다.
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/courses/${course.id}`}
                        className="text-sm font-medium hover:text-blue-400"
                      >
                        {course.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {course.instructor?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {course.enrolled_count || 0} / {course.max_students || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[course.status] || 'bg-gray-600/20 text-gray-400'}`}
                      >
                        {STATUS_LABELS[course.status] || course.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {course.created_at
                          ? format(new Date(course.created_at), 'yyyy-MM-dd')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewCourseDetail(course.id)}
                          className="p-1 hover:bg-gray-600 rounded transition"
                          title="상세 보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {course.status === 'draft' && (
                          <>
                            <button
                              onClick={() =>
                                updateCourseStatus(course.id, 'published')
                              }
                              className="p-1 hover:bg-gray-600 rounded transition"
                              title="승인"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCourse(course)
                                setShowRejectModal(true)
                              }}
                              className="p-1 hover:bg-gray-600 rounded transition"
                              title="거부"
                            >
                              <X className="w-4 h-4 text-red-400" />
                            </button>
                          </>
                        )}
                        {course.status === 'published' && (
                          <button
                            onClick={() =>
                              updateCourseStatus(course.id, 'archived')
                            }
                            className="p-1 hover:bg-gray-600 rounded transition"
                            title="보관"
                          >
                            <Archive className="w-4 h-4 text-yellow-400" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteCourse(course.id)}
                          className="p-1 hover:bg-gray-600 rounded transition"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
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
              전체 {total}개 중 {(page - 1) * 20 + 1}-
              {Math.min(page * 20, total)}개 표시
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

      {/* 강의 거부 모달 */}
      {showRejectModal && selectedCourse && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowRejectModal(false)
            setSelectedCourse(null)
            setRejectReason('')
          }}
        >
          <div
            className="bg-gray-800 rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-4">강의 거부</h3>
            <p className="text-gray-400 mb-4">
              <strong>{selectedCourse.title}</strong> 강의를 거부하시겠습니까?
            </p>
            <textarea
              placeholder="거부 사유를 입력하세요..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows="4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setSelectedCourse(null)
                  setRejectReason('')
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition"
              >
                취소
              </button>
              <button
                onClick={() =>
                  updateCourseStatus(
                    selectedCourse.id,
                    'archived',
                    rejectReason
                  )
                }
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
              >
                거부
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 강의 상세 모달 */}
      {selectedCourse && !showRejectModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCourse(null)}
        >
          <div
            className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-4">강의 상세 정보</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">강의명</p>
                <p className="text-lg font-medium">{selectedCourse.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">강사</p>
                <p className="text-lg">{selectedCourse.instructor?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">설명</p>
                <p className="text-sm">{selectedCourse.description || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">가격</p>
                  <p className="text-lg">
                    ₩{selectedCourse.price?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">최대 인원</p>
                  <p className="text-lg">{selectedCourse.max_students || 0}명</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">수강생 목록</p>
                {selectedCourse.enrollments?.length === 0 ? (
                  <p className="text-gray-500">수강생이 없습니다.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {selectedCourse.enrollments?.map((enrollment) => (
                      <li
                        key={enrollment.id}
                        className="text-sm p-2 bg-gray-700 rounded"
                      >
                        {enrollment.student?.name || '이름 없음'} (
                        {enrollment.student?.email || '이메일 없음'})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedCourse(null)}
              className="mt-6 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
