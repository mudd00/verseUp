import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { apiService } from '@/services/api.js'

export default function CourseMaterials({ courseId, isInstructor, weeks = 8 }) {
  const [materials, setMaterials] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedWeek, setSelectedWeek] = useState(0) // 0 = 전체

  // Upload form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [weekNumber, setWeekNumber] = useState(null)

  // Fetch materials
  useEffect(() => {
    fetchMaterials()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const fetchMaterials = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.get(`/courses/${courseId}/materials`)
      setMaterials(response.materials || [])
    } catch (error) {
      console.error('Failed to fetch materials:', error)
      toast.error('자료를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('파일 크기는 50MB를 초과할 수 없습니다.')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()

    if (!selectedFile || !title.trim()) {
      toast.error('제목과 파일을 모두 입력해주세요.')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // FormData 생성 (백엔드로 파일 전송)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', title.trim())
      formData.append('description', description.trim() || '')
      if (weekNumber) {
        formData.append('week_number', weekNumber.toString())
      }

      setUploadProgress(25)

      // 백엔드로 파일 업로드 (Service Role Key 사용, RLS 우회)
      // FormData 사용 시 Content-Type 헤더를 설정하지 않아야 브라우저가 boundary를 자동 추가
      const response = await apiService.request(
        `/courses/${courseId}/materials/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      setUploadProgress(100)

      // Add to materials list
      setMaterials([response.material, ...materials])

      // Reset form
      setTitle('')
      setDescription('')
      setSelectedFile(null)
      setWeekNumber(selectedWeek > 0 ? selectedWeek : null)
      e.target.reset()

      toast.success('자료가 업로드되었습니다!')
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error(error.message || '업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (materialId, fileUrl) => {
    if (!window.confirm('이 자료를 삭제하시겠습니까?')) {
      return
    }

    try {
      await apiService.delete(`/courses/${courseId}/materials/${materialId}`)
      setMaterials(materials.filter((m) => m.id !== materialId))
      toast.success('자료가 삭제되었습니다.')
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('삭제에 실패했습니다.')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType.startsWith('video/')) return '🎥'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦'
    if (
      fileType.includes('word') ||
      fileType.includes('document') ||
      fileType.includes('msword')
    )
      return '📝'
    if (
      fileType.includes('presentation') ||
      fileType.includes('powerpoint') ||
      fileType.includes('mspowerpoint')
    )
      return '📊'
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📈'
    return '📎'
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">
        자료를 불러오는 중...
      </div>
    )
  }

  const filteredMaterials =
    selectedWeek === 0
      ? materials
      : materials.filter((m) => m.week_number === selectedWeek)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">강의 자료 관리</h3>
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

      {/* Upload Form (Instructor Only) */}
      {isInstructor && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">자료 업로드</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                주차
              </label>
              <select
                value={weekNumber || ''}
                onChange={(e) =>
                  setWeekNumber(e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                disabled={isUploading}
              >
                <option value="">선택 안 함</option>
                {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => (
                  <option key={week} value={week}>
                    {week}주차
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                제목 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="예: 1주차 강의자료"
                required
                disabled={isUploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                설명 (선택사항)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="자료에 대한 간단한 설명"
                rows={2}
                disabled={isUploading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                파일 <span className="text-red-400">*</span>
              </label>
              <input
                type="file"
                onChange={handleFileSelect}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                disabled={isUploading}
                required
              />
              <p className="text-sm text-gray-400 mt-1">
                최대 파일 크기: 50MB
              </p>
            </div>

            {isUploading && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUploading}
            >
              {isUploading ? '업로드 중...' : '업로드'}
            </button>
          </form>
        </div>
      )}

      {/* Materials List */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">
          강의 자료 목록
          {selectedWeek > 0 && ` - ${selectedWeek}주차`}
        </h3>

        {filteredMaterials.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            {selectedWeek === 0
              ? '아직 업로드된 자료가 없습니다.'
              : `${selectedWeek}주차 자료가 없습니다.`}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {getFileIcon(material.file_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{material.title}</h4>
                      {material.week_number && (
                        <span className="px-2 py-0.5 text-xs bg-purple-600/20 text-purple-400 rounded flex-shrink-0">
                          {material.week_number}주차
                        </span>
                      )}
                    </div>
                    {material.description && (
                      <p className="text-sm text-gray-400 truncate">
                        {material.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {material.file_name} • {formatFileSize(material.file_size)}{' '}
                      • {new Date(material.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm"
                  >
                    다운로드
                  </a>
                  {isInstructor && (
                    <button
                      onClick={() => handleDelete(material.id, material.file_url)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
