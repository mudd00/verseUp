import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import toast from 'react-hot-toast'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function EditAssignment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    max_score: 100,
    due_date: '',
    allow_late_submission: false,
    late_penalty_percent: 0,
  })

  // 과제 데이터 조회
  const { data: assignment, isLoading } = useQuery({
    queryKey: ['assignment', id],
    queryFn: async () => {
      const res = await api.get(`/assignments/${id}`)
      return res
    },
    enabled: !!id,
  })

  // 폼 데이터 초기화
  useEffect(() => {
    if (assignment) {
      setFormData({
        title: assignment.title || '',
        description: assignment.description || '',
        instructions: assignment.instructions || '',
        max_score: assignment.max_score || 100,
        due_date: assignment.due_date
          ? new Date(assignment.due_date).toISOString().slice(0, 16)
          : '',
        allow_late_submission: assignment.allow_late_submission || false,
        late_penalty_percent: assignment.late_penalty_percent || 0,
      })
    }
  }, [assignment])

  // 과제 수정 mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await api.put(`/assignments/${id}`, data)
    },
    onSuccess: () => {
      toast.success('과제가 수정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['assignment', id] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      navigate(`/assignments/${id}`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '과제 수정에 실패했습니다')
    },
  })

  // 과제 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/assignments/${id}`)
    },
    onSuccess: () => {
      toast.success('과제가 삭제되었습니다')
      navigate(-1)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '과제 삭제에 실패했습니다')
    },
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('과제 제목을 입력해주세요')
      return
    }

    if (!formData.due_date) {
      toast.error('마감일을 설정해주세요')
      return
    }

    updateMutation.mutate({
      ...formData,
      max_score: Number(formData.max_score),
      late_penalty_percent: Number(formData.late_penalty_percent),
    })
  }

  const handleDelete = () => {
    if (confirm('정말 이 과제를 삭제하시겠습니까?\n제출된 과제도 모두 삭제됩니다.')) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">과제 정보를 불러오는 중...</p>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">과제를 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 뒤로 가기 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        뒤로 가기
      </button>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">과제 수정</h1>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded transition"
          >
            {deleteMutation.isPending ? '삭제 중...' : '과제 삭제'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 제목 */}
          <div>
            <label className="block text-gray-300 mb-2">
              과제 제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              placeholder="예: 1주차 과제 - React 기초"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-gray-300 mb-2">과제 설명</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              rows="3"
              placeholder="과제에 대한 간단한 설명을 입력하세요"
            />
          </div>

          {/* 과제 안내 */}
          <div>
            <label className="block text-gray-300 mb-2">과제 안내 (상세)</label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              rows="8"
              placeholder="과제 수행 방법, 제출 형식, 평가 기준 등을 상세히 작성하세요"
            />
          </div>

          {/* 만점 */}
          <div>
            <label className="block text-gray-300 mb-2">
              만점 <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              name="max_score"
              value={formData.max_score}
              onChange={handleChange}
              min="1"
              max="1000"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* 마감일 */}
          <div>
            <label className="block text-gray-300 mb-2">
              마감일 <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* 지각 제출 허용 */}
          <div className="border border-gray-700 rounded p-4 space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="allow_late_submission"
                checked={formData.allow_late_submission}
                onChange={handleChange}
                className="w-5 h-5 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label className="text-gray-300">지각 제출 허용</label>
            </div>

            {formData.allow_late_submission && (
              <div>
                <label className="block text-gray-300 mb-2">
                  지각 제출 감점 비율 (%)
                </label>
                <input
                  type="number"
                  name="late_penalty_percent"
                  value={formData.late_penalty_percent}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-sm text-gray-400 mt-2">
                  마감일 이후 제출 시 {formData.late_penalty_percent}% 감점됩니다
                </p>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition"
            >
              {updateMutation.isPending ? '수정 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
