import { apiService } from './api'

/**
 * 과제 파일 업로드 - 백엔드 API 사용 (POST /api/assignments/:id/upload)
 * @param {File} file - 업로드할 파일
 * @param {string} assignmentId - 과제 ID
 * @returns {Promise<{file_url: string, file_name: string, file_size: number, file_type: string}>}
 */
export async function uploadAssignmentFile(file, assignmentId) {
  if (!file) {
    throw new Error('파일이 선택되지 않았습니다')
  }

  // 파일 크기 제한 (20MB)
  const MAX_FILE_SIZE = 20 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 20MB를 초과할 수 없습니다')
  }

  try {
    // Create FormData for file upload
    const formData = new FormData()
    formData.append('file', file)

    // Use fetch directly for FormData upload
    const token = localStorage.getItem('authToken')
    const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/assignments/${assignmentId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '파일 업로드에 실패했습니다')
    }

    const data = await response.json()
    return {
      file_url: data.file_url,
      file_name: data.file_name,
      file_size: data.file_size,
      file_type: data.file_type,
    }
  } catch (error) {
    console.error('Upload service error:', error)
    throw error
  }
}

/**
 * 강의 자료 파일 업로드 - 백엔드 API 사용 (POST /api/courses/:courseId/materials/upload)
 * 이 함수는 더 이상 사용되지 않습니다. 대신 백엔드 API를 직접 호출하세요.
 * @deprecated Use backend API POST /api/courses/:courseId/materials/upload instead
 */
export async function uploadCourseMaterial(file, courseId, uploaderId) {
  throw new Error('이 함수는 더 이상 사용되지 않습니다. 백엔드 API POST /api/courses/:courseId/materials/upload를 직접 사용하세요.')
}

/**
 * 파일 삭제 - 백엔드 API 사용
 * 이 함수는 더 이상 사용되지 않습니다. 파일 삭제는 각 리소스 삭제 API에서 처리됩니다.
 * @deprecated Files are deleted automatically when deleting the parent resource (material, assignment, etc.)
 */
export async function deleteFile(fileUrl, bucketName = 'assignment-files') {
  throw new Error('이 함수는 더 이상 사용되지 않습니다. 파일 삭제는 리소스 삭제 시 자동으로 처리됩니다.')
}

/**
 * 허용된 파일 타입 검증
 * @param {File} file - 검증할 파일
 * @param {string[]} allowedTypes - 허용된 MIME 타입 배열
 * @returns {boolean}
 */
export function validateFileType(file, allowedTypes = []) {
  if (allowedTypes.length === 0) {
    return true // 제한 없음
  }

  return allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      // image/*, video/* 등
      const category = type.split('/')[0]
      return file.type.startsWith(category + '/')
    }
    return file.type === type
  })
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 * @param {number} bytes - 바이트 크기
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
