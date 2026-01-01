import { useState, useEffect } from 'react'
import { Search, UserCheck, UserX, Eye } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ROLE_LABELS = {
  student: '학생',
  instructor: '강사',
  admin: '관리자',
  parent: '부모',
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [page, search, roleFilter])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      })

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error)
      toast.error('사용자 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadUsers()
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ active: !currentStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      toast.success('사용자 상태가 변경되었습니다.')
      loadUsers()
    } catch (error) {
      console.error('사용자 상태 변경 실패:', error)
      toast.error('사용자 상태 변경에 실패했습니다.')
    }
  }

  const viewUserDetail = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user detail')
      }

      const user = await response.json()
      setSelectedUser(user)
    } catch (error) {
      console.error('사용자 상세 조회 실패:', error)
      toast.error('사용자 정보를 불러오는데 실패했습니다.')
    }
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">사용자 관리</h1>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">전체 사용자</p>
          <p className="text-2xl font-bold">{total}명</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">학생</p>
          <p className="text-2xl font-bold text-blue-400">
            {users.filter((u) => u.role === 'student').length}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">강사</p>
          <p className="text-2xl font-bold text-green-400">
            {users.filter((u) => u.role === 'instructor').length}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">부모</p>
          <p className="text-2xl font-bold text-yellow-400">
            {users.filter((u) => u.role === 'parent').length}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">관리자</p>
          <p className="text-2xl font-bold text-purple-400">
            {users.filter((u) => u.role === 'admin').length}
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
              placeholder="이름 또는 이메일로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 역할</option>
            <option value="student">학생</option>
            <option value="instructor">강사</option>
            <option value="parent">부모</option>
            <option value="admin">관리자</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            검색
          </button>
        </form>
      </div>

      {/* 사용자 테이블 */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  역할
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  상태
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-600/20 text-purple-400'
                            : user.role === 'instructor'
                              ? 'bg-green-600/20 text-green-400'
                              : user.role === 'parent'
                                ? 'bg-yellow-600/20 text-yellow-400'
                                : 'bg-blue-600/20 text-blue-400'
                        }`}
                      >
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {user.created_at
                          ? format(new Date(user.created_at), 'yyyy-MM-dd')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.active !== false
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}
                      >
                        {user.active !== false ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewUserDetail(user.id)}
                          className="p-1 hover:bg-gray-600 rounded transition"
                          title="상세 보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            toggleUserStatus(user.id, user.active !== false)
                          }
                          className="p-1 hover:bg-gray-600 rounded transition"
                          title={
                            user.active !== false ? '비활성화' : '활성화'
                          }
                        >
                          {user.active !== false ? (
                            <UserX className="w-4 h-4 text-red-400" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-green-400" />
                          )}
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
              전체 {total}명 중 {(page - 1) * 20 + 1}-
              {Math.min(page * 20, total)}명 표시
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

      {/* 사용자 상세 모달 */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-4">사용자 상세 정보</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">이름</p>
                <p className="text-lg font-medium">{selectedUser.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">이메일</p>
                <p className="text-lg">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">역할</p>
                <p className="text-lg">
                  {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">가입일</p>
                <p className="text-lg">
                  {selectedUser.created_at
                    ? format(
                        new Date(selectedUser.created_at),
                        'yyyy-MM-dd HH:mm'
                      )
                    : '-'}
                </p>
              </div>

              {selectedUser.role === 'student' && selectedUser.enrollments && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">수강 내역</p>
                  {selectedUser.enrollments.length === 0 ? (
                    <p className="text-gray-500">수강 중인 강의가 없습니다.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedUser.enrollments.map((enrollment) => (
                        <li
                          key={enrollment.id}
                          className="p-2 bg-gray-700 rounded"
                        >
                          {enrollment.courses?.title || '강의 정보 없음'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {selectedUser.role === 'instructor' && selectedUser.courses && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">개설 강의</p>
                  {selectedUser.courses.length === 0 ? (
                    <p className="text-gray-500">개설한 강의가 없습니다.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedUser.courses.map((course) => (
                        <li key={course.id} className="p-2 bg-gray-700 rounded">
                          {course.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedUser(null)}
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
