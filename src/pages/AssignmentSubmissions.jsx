import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import toast from 'react-hot-toast'
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function AssignmentSubmissions() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [gradeData, setGradeData] = useState({ score: '', feedback: '' })

  // 과제 정보 조회
  const { data: assignment } = useQuery({
    queryKey: ['assignment', id],
    queryFn: async () => {
      const res = await api.get(`/assignments/${id}`)
      return res.data
    },
    enabled: !!id,
  })

  // 제출 목록 조회
  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['submissions', id],
    queryFn: async () => {
      const res = await api.get(`/assignments/${id}/submissions`)
      return res.data
    },
    enabled: !!id,
  })

  // 채점 mutation
  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, score, feedback }) => {
      await api.put(`/submissions/${submissionId}/grade`, { score, feedback })
    },
    onSuccess: () => {
      toast.success('채점이 완료되었습니다')
      queryClient.invalidateQueries({ queryKey: ['submissions', id] })
      setSelectedSubmission(null)
      setGradeData({ score: '', feedback: '' })
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '채점에 실패했습니다')
    },
  })

  const submissions = submissionsData?.submissions || []

  const handleGrade = (submission) => {
    setSelectedSubmission(submission)
    setGradeData({
      score: submission.score?.toString() || '',
      feedback: submission.feedback || '',
    })
  }

  const handleSubmitGrade = (e) => {
    e.preventDefault()

    if (!gradeData.score) {
      toast.error('점수를 입력해주세요')
      return
    }

    const score = Number(gradeData.score)
    if (score < 0 || score > assignment.max_score) {
      toast.error(`점수는 0에서 ${assignment.max_score} 사이여야 합니다`)
      return
    }

    gradeMutation.mutate({
      submissionId: selectedSubmission.id,
      score,
      feedback: gradeData.feedback,
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      submitted: { text: '제출 완료', color: 'blue', icon: CheckCircleIcon },
      late: { text: '지각 제출', color: 'orange', icon: ClockIcon },
      graded: { text: '채점 완료', color: 'green', icon: CheckCircleIcon },
    }

    const badge = badges[status] || badges.submitted
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs bg-${badge.color}-500/20 text-${badge.color}-400 rounded`}>
        <Icon className="w-4 h-4" />
        {badge.text}
      </span>
    )
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">제출 현황을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 뒤로 가기 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        뒤로 가기
      </button>

      {/* 헤더 */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">{assignment?.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>제출: {submissions.length}명</span>
          <span>•</span>
          <span>
            채점 완료: {submissions.filter((s) => s.status === 'graded').length}명
          </span>
          <span>•</span>
          <span>만점: {assignment?.max_score}점</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 제출 목록 */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">제출 목록</h2>

          {submissions.length === 0 ? (
            <p className="text-gray-400 text-center py-8">아직 제출한 학생이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <button
                  key={submission.id}
                  onClick={() => handleGrade(submission)}
                  className={`w-full text-left p-4 rounded border transition ${
                    selectedSubmission?.id === submission.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-750 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">
                        {submission.student?.name || '알 수 없음'}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {submission.student?.email}
                      </p>
                    </div>
                    {getStatusBadge(submission.status)}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>제출: {formatDate(submission.submitted_at)}</span>
                    {submission.status === 'graded' && (
                      <>
                        <span>•</span>
                        <span className="text-green-400">
                          {submission.score}/{assignment?.max_score}점
                        </span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 채점 섹션 */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">채점</h2>

          {selectedSubmission ? (
            <div className="space-y-4">
              {/* 학생 정보 */}
              <div className="bg-gray-750 p-4 rounded">
                <h3 className="font-medium text-white mb-1">
                  {selectedSubmission.student?.name}
                </h3>
                <p className="text-sm text-gray-400">
                  {selectedSubmission.student?.email}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  제출: {formatDate(selectedSubmission.submitted_at)}
                </p>
              </div>

              {/* 제출 내용 */}
              {selectedSubmission.content && (
                <div>
                  <label className="block text-gray-300 mb-2 text-sm">제출 내용</label>
                  <div className="bg-gray-750 p-4 rounded text-gray-300 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {selectedSubmission.content}
                  </div>
                </div>
              )}

              {/* 첨부 파일 */}
              {selectedSubmission.file_url && (
                <div>
                  <label className="block text-gray-300 mb-2 text-sm">첨부 파일</label>
                  <a
                    href={selectedSubmission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition text-sm"
                  >
                    📎 {selectedSubmission.file_name}
                  </a>
                </div>
              )}

              {/* 채점 폼 */}
              <form onSubmit={handleSubmitGrade} className="space-y-4 pt-4 border-t border-gray-700">
                <div>
                  <label className="block text-gray-300 mb-2 text-sm">
                    점수 (0 ~ {assignment?.max_score})
                  </label>
                  <input
                    type="number"
                    value={gradeData.score}
                    onChange={(e) =>
                      setGradeData((prev) => ({ ...prev, score: e.target.value }))
                    }
                    min="0"
                    max={assignment?.max_score}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                    placeholder="점수 입력"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 text-sm">
                    피드백 (선택)
                  </label>
                  <textarea
                    value={gradeData.feedback}
                    onChange={(e) =>
                      setGradeData((prev) => ({ ...prev, feedback: e.target.value }))
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                    rows="4"
                    placeholder="학생에게 전달할 피드백을 작성하세요"
                  />
                </div>

                <button
                  type="submit"
                  disabled={gradeMutation.isPending}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition"
                >
                  {gradeMutation.isPending ? '채점 중...' : '채점 완료'}
                </button>
              </form>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">
              채점할 제출물을 선택해주세요
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
