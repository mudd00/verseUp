import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiService } from '@/services/api.js'
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon } from 'lucide-react'

export default function CourseAssignments({ courseId, isInstructor, weeks = 8 }) {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(0) // 0 = 전체

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    max_score: 100,
    due_date: '',
    week_number: null,
    allow_late_submission: false,
    late_penalty_percent: 0,
  })

  useEffect(() => {
    fetchAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const fetchAssignments = async () => {
    if (!courseId) return

    try {
      setIsLoading(true)
      const response = await apiService.get(`/courses/${courseId}/assignments`)
      setAssignments(response.assignments || [])
    } catch (error) {
      console.error('Failed to fetch assignments:', error)
      toast.error('과제를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (assignment = null) => {
    if (assignment) {
      // 수정 모드
      setEditingAssignment(assignment)
      setFormData({
        title: assignment.title || '',
        description: assignment.description || '',
        instructions: assignment.instructions || '',
        max_score: assignment.max_score || 100,
        due_date: assignment.due_date
          ? new Date(assignment.due_date).toISOString().slice(0, 16)
          : '',
        week_number: assignment.week_number || null,
        allow_late_submission: assignment.allow_late_submission || false,
        late_penalty_percent: assignment.late_penalty_percent || 0,
      })
    } else {
      // 생성 모드
      setEditingAssignment(null)
      setFormData({
        title: '',
        description: '',
        instructions: '',
        max_score: 100,
        due_date: '',
        week_number: selectedWeek > 0 ? selectedWeek : null,
        allow_late_submission: false,
        late_penalty_percent: 0,
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingAssignment(null)
    setFormData({
      title: '',
      description: '',
      instructions: '',
      max_score: 100,
      due_date: '',
      week_number: null,
      allow_late_submission: false,
      late_penalty_percent: 0,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('과제 제목을 입력해주세요.')
      return
    }

    if (!formData.due_date) {
      toast.error('제출 마감일을 설정해주세요.')
      return
    }

    try {
      setIsSubmitting(true)

      const payload = {
        ...formData,
        week_number: formData.week_number || null,
      }

      if (editingAssignment) {
        // 수정
        await apiService.put(`/assignments/${editingAssignment.id}`, payload)
        toast.success('과제가 수정되었습니다.')
      } else {
        // 생성
        await apiService.post(`/courses/${courseId}/assignments`, payload)
        toast.success('과제가 등록되었습니다.')
      }

      await fetchAssignments()
      handleCloseModal()
    } catch (error) {
      console.error('Failed to save assignment:', error)
      toast.error(
        error.response?.data?.error ||
          `과제 ${editingAssignment ? '수정' : '등록'}에 실패했습니다.`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (assignmentId) => {
    if (!confirm('정말 이 과제를 삭제하시겠습니까?')) {
      return
    }

    try {
      await apiService.delete(`/assignments/${assignmentId}`)
      toast.success('과제가 삭제되었습니다.')
      await fetchAssignments()
    } catch (error) {
      console.error('Failed to delete assignment:', error)
      toast.error('과제 삭제에 실패했습니다.')
    }
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

  const filteredAssignments =
    selectedWeek === 0
      ? assignments
      : assignments.filter((a) => a.week_number === selectedWeek)

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">과제 관리</h3>
        {isInstructor && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            과제 등록
          </button>
        )}
      </div>

      {/* 주차 필터 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedWeek(0)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedWeek === 0
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          전체
        </button>
        {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => (
          <button
            key={week}
            onClick={() => setSelectedWeek(week)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedWeek === week
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {week}주차
          </button>
        ))}
      </div>

      {/* 과제 목록 */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">
            {selectedWeek === 0
              ? '등록된 과제가 없습니다.'
              : `${selectedWeek}주차 과제가 없습니다.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-white truncate">
                      {assignment.title}
                    </h4>
                    {assignment.week_number && (
                      <span className="px-2 py-0.5 text-xs bg-purple-600/20 text-purple-400 rounded">
                        {assignment.week_number}주차
                      </span>
                    )}
                  </div>

                  {assignment.description && (
                    <p className="text-sm text-gray-300 mb-3">
                      {assignment.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{formatDueDate(assignment.due_date)}</span>
                    </div>
                    <span>만점: {assignment.max_score}점</span>
                    {assignment.allow_late_submission && (
                      <span className="text-yellow-400">지각 제출 허용</span>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                {isInstructor && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(assignment)}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition"
                      title="수정"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(assignment.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition"
                      title="삭제"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/assignments/${assignment.id}/submissions`)
                      }
                      className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                    >
                      제출 현황
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 과제 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">
                {editingAssignment ? '과제 수정' : '과제 등록'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  과제 제목 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="예: 1주차 과제 - React 기초"
                  required
                />
              </div>

              {/* 주차 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  주차
                </label>
                <select
                  value={formData.week_number || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      week_number: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">선택 안 함</option>
                  {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => (
                    <option key={week} value={week}>
                      {week}주차
                    </option>
                  ))}
                </select>
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="과제에 대한 간단한 설명을 입력하세요"
                />
              </div>

              {/* 과제 지시사항 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  과제 지시사항
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) =>
                    setFormData({ ...formData, instructions: e.target.value })
                  }
                  rows={5}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="학생들이 수행해야 할 구체적인 과제 내용을 입력하세요"
                />
              </div>

              {/* 만점 및 마감일 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    만점 *
                  </label>
                  <input
                    type="number"
                    value={formData.max_score}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_score: parseInt(e.target.value) || 100,
                      })
                    }
                    min="1"
                    max="1000"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    제출 마감일 *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* 지각 제출 옵션 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allow_late"
                    checked={formData.allow_late_submission}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allow_late_submission: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="allow_late" className="text-sm text-gray-300">
                    지각 제출 허용
                  </label>
                </div>

                {formData.allow_late_submission && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      지각 감점 비율 (%)
                    </label>
                    <input
                      type="number"
                      value={formData.late_penalty_percent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          late_penalty_percent: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? '처리 중...'
                    : editingAssignment
                    ? '수정하기'
                    : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
