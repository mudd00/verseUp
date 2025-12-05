import { useState } from 'react'
import toast from 'react-hot-toast'

export default function CourseMaterialsUpload({ materials, onMaterialsChange }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

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

  const handleUpload = (e) => {
    e.preventDefault()

    if (!selectedFile || !title.trim()) {
      toast.error('제목과 파일을 모두 입력해주세요.')
      return
    }

    // Add material to list
    const newMaterial = {
      id: `temp-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || null,
      file: selectedFile,
      file_name: selectedFile.name,
      file_size: selectedFile.size,
      file_type: selectedFile.type || 'application/octet-stream',
    }

    onMaterialsChange([...materials, newMaterial])

    // Reset form
    setTitle('')
    setDescription('')
    setSelectedFile(null)
    // Reset file input
    const fileInput = e.target.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ''

    toast.success('자료가 추가되었습니다!')
  }

  const handleDelete = (materialId) => {
    onMaterialsChange(materials.filter((m) => m.id !== materialId))
    toast.success('자료가 제거되었습니다.')
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
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

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">자료 업로드</h3>
        <form onSubmit={handleUpload} className="space-y-4">
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
              required
            />
            <p className="text-sm text-gray-400 mt-1">
              최대 파일 크기: 50MB
            </p>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            업로드
          </button>
        </form>
      </div>

      {/* Materials List */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">강의 자료</h3>

        {materials.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            아직 추가된 자료가 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {materials.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {getFileIcon(material.file_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{material.title}</h4>
                    {material.description && (
                      <p className="text-sm text-gray-400 truncate">
                        {material.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {material.file_name} • {formatFileSize(material.file_size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleDelete(material.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
