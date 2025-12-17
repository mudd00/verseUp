import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { PlusIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function AssignmentList({ courseId, isInstructor }) {
  const { user } = useAuthStore()
  const [selectedAssignment, setSelectedAssignment] = useState(null)

  // 과제 목록 조회
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ['assignments', courseId],
    queryFn: async () => {
      const res = await api.get(`/courses/${courseId}/assignments`)
      return res.data
    },
    enabled: !!courseId,
  })

  const assignments = assignmentsData?.assignments || []

  const getStatusBadge = (assignment) => {
    if (isInstructor) return null

    const submission = assignment.my_submission
    if (!submission) {
      const dueDate = new Date(assignment.due_date)
      const now = new Date()
      if (now > dueDate) {
        return (
          <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">
            미제출
          </span>
        )
      }
      return (
        <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
          제출 필요
        </span>
      )
    }

    if (submission.status === 'graded') {
      return (
        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
          채점 완료 ({submission.score}점)
        </span>
      )
    }

    if (submission.status === 'late') {
      return (
        <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded">
          지각 제출
        </span>
      )
    }

    return (
      <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">
        제출 완료
      </span>
    )
  }

  const formatDueDate = (dateString) => {
    if (!dateString) return '기한 없음'
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isDueSoon = (dueDate) => {
    if (!dueDate) return false
    const due = new Date(dueDate)
    const now = new Date()
    const diff = due - now
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000 // 3 days
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">과제 목록을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">과제</h2>
        {isInstructor && (
          <Link
            to={`/courses/${courseId}/assignments/new`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            <PlusIcon className="w-5 h-5" />
            과제 등록
          </Link>
        )}
      </div>

      {/* 과제 목록 */}
      {assignments.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">등록된 과제가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <Link
              key={assignment.id}
              to={`/assignments/${assignment.id}`}
              className="block bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {assignment.title}
                    </h3>
                    {getStatusBadge(assignment)}
                  </div>

                  {assignment.description && (
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span
                        className={
                          isDueSoon(assignment.due_date)
                            ? 'text-yellow-400 font-medium'
                            : ''
                        }
                      >
                        {formatDueDate(assignment.due_date)}
                      </span>
                    </div>
                    <span>만점: {assignment.max_score}점</span>
                  </div>
                </div>

                {isInstructor && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Link
                      to={`/assignments/${assignment.id}/edit`}
                      className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      수정
                    </Link>
                    <Link
                      to={`/assignments/${assignment.id}/submissions`}
                      className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      제출 현황
                    </Link>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
