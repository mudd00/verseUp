import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { ArrowLeftIcon, DocumentTextIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'

export default function AssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [submissionContent, setSubmissionContent] = useState('')
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // 과제 상세 조회
  const { data: assignment, isLoading } = useQuery({
    queryKey: ['assignment', id],
    queryFn: async () => {
      const res = await api.get(`/assignments/${id}`)
      return res.data
    },
    enabled: !!id,
  })

  // 과제 제출
  const submitMutation = useMutation({
    mutationFn: async (submissionData) => {
      await api.post(`/assignments/${id}/submit`, submissionData)
    },
    onSuccess: () => {
      toast.success('과제가 제출되었습니다')
      queryClient.invalidateQueries({ queryKey: ['assignment', id] })
      setSubmissionContent('')
      setFile(null)
      setIsUploading(false)
      setUploadProgress(0)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '과제 제출에 실패했습니다')
      setIsUploading(false)
      setUploadProgress(0)
    },
  })

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check file size (max 20MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error('파일 크기는 20MB를 초과할 수 없습니다.')
        e.target.value = null // Reset input
        return
      }
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!submissionContent && !file) {
      toast.error('내용을 입력하거나 파일을 첨부해주세요')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      let fileUrl = null
      let fileName = null
      let fileSize = null
      let fileType = null

      // Upload file if selected
      if (file) {
        // Generate unique file path: {assignmentId}/{studentId}/{timestamp}_{filename}
        const fileExt = file.name.split('.').pop()
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${id}/${user.id}/${uniqueFileName}`

        setUploadProgress(25)

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('assignment-submissions')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw new Error('파일 업로드에 실패했습니다.')
        }

        setUploadProgress(60)

        // Get signed URL (private bucket requires signed URL)
        const { data: urlData, error: urlError } = await supabase.storage
          .from('assignment-submissions')
          .createSignedUrl(filePath, 31536000) // 1 year expiry

        if (urlError) {
          console.error('URL generation error:', urlError)
          throw new Error('파일 URL 생성에 실패했습니다.')
        }

        setUploadProgress(80)

        fileUrl = urlData.signedUrl
        fileName = file.name
        fileSize = file.size
        fileType = file.type || 'application/octet-stream'
      }

      setUploadProgress(90)

      // Submit assignment with file metadata
      submitMutation.mutate({
        content: submissionContent,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
      })

      setUploadProgress(100)
    } catch (error) {
      console.error('Submission failed:', error)
      toast.error(error.message || '제출에 실패했습니다.')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '기한 없음'
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const isDue = (dueDate) => {
    if (!dueDate) return false
    return new Date() > new Date(dueDate)
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

  const isStudent = user?.role === 'student'
  const submission = assignment.my_submission
  const isGraded = submission?.status === 'graded'

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 뒤로 가기 */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition">
        <ArrowLeftIcon className="w-5 h-5" />
        뒤로 가기
      </button>

      {/* 과제 정보 */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-white mb-4">{assignment.title}</h1>

        <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
          <span>만점: {assignment.max_score}점</span>
          <span>•</span>
          <span className={isDue(assignment.due_date) ? 'text-red-400' : ''}>마감: {formatDate(assignment.due_date)}</span>
          {assignment.allow_late_submission && (
            <>
              <span>•</span>
              <span className="text-yellow-400">지각 제출 허용 (감점: {assignment.late_penalty_percent}%)</span>
            </>
          )}
        </div>

        {assignment.description && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white mb-2">설명</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{assignment.description}</p>
          </div>
        )}

        {assignment.instructions && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">과제 안내</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
        )}
      </div>

      {/* 제출 정보 (학생용) */}
      {isStudent && (
        <>
          {submission ? (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">제출 내역</h2>

              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">제출일: </span>
                  <span className="text-white">{formatDate(submission.submitted_at)}</span>
                </div>

                <div>
                  <span className="text-gray-400">상태: </span>
                  <span
                    className={isGraded ? 'text-green-400' : submission.status === 'late' ? 'text-orange-400' : 'text-blue-400'}
                  >
                    {isGraded ? '채점 완료' : submission.status === 'late' ? '지각 제출' : '제출 완료'}
                  </span>
                </div>

                {isGraded && (
                  <>
                    <div>
                      <span className="text-gray-400">점수: </span>
                      <span className="text-white font-semibold text-lg">
                        {submission.score} / {assignment.max_score}
                      </span>
                    </div>

                    {submission.feedback && (
                      <div>
                        <span className="text-gray-400">피드백:</span>
                        <p className="text-gray-300 mt-2 whitespace-pre-wrap bg-gray-750 p-3 rounded">{submission.feedback}</p>
                      </div>
                    )}
                  </>
                )}

                {submission.content && (
                  <div>
                    <span className="text-gray-400">제출 내용:</span>
                    <p className="text-gray-300 mt-2 whitespace-pre-wrap bg-gray-750 p-3 rounded">{submission.content}</p>
                  </div>
                )}

                {/* File Download Link */}
                {submission.file_url && (
                  <div>
                    <span className="text-gray-400">첨부 파일:</span>
                    <div className="mt-2">
                      <a
                        href={submission.file_url}
                        download={submission.file_name}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition text-sm"
                      >
                        <DocumentTextIcon className="w-4 h-4" />
                        {submission.file_name} ({formatFileSize(submission.file_size)})
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">과제 제출</h2>

              {isDue(assignment.due_date) && !assignment.allow_late_submission ? (
                <div className="bg-red-500/20 border border-red-500 rounded p-4">
                  <p className="text-red-400">제출 기한이 지났습니다.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">내용</label>
                    <textarea
                      value={submissionContent}
                      onChange={(e) => setSubmissionContent(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                      rows="6"
                      placeholder="과제 내용을 입력하세요"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">파일 첨부</label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.txt,.jpg,.jpeg,.png,.gif,.js,.html,.css"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                    />
                    <p className="text-sm text-gray-400 mt-1">최대 파일 크기: 20MB</p>
                    {file && (
                      <p className="text-sm text-gray-400 mt-2">
                        선택된 파일: {file.name} ({formatFileSize(file.size)})
                      </p>
                    )}
                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">업로드 중... {uploadProgress}%</p>
                    </div>
                  )}

                  {isDue(assignment.due_date) && assignment.allow_late_submission && (
                    <div className="bg-yellow-500/20 border border-yellow-500 rounded p-3">
                      <p className="text-yellow-400 text-sm">
                        마감일이 지났습니다. 지각 제출 시 {assignment.late_penalty_percent}% 감점됩니다.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitMutation.isPending || isUploading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded transition"
                  >
                    <CloudArrowUpIcon className="w-5 h-5" />
                    {isUploading ? '업로드 중...' : submitMutation.isPending ? '제출 중...' : '제출하기'}
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
