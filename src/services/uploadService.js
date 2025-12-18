import { supabase } from '@/lib/supabase'

/**
 * 과제 파일 업로드
 * @param {File} file - 업로드할 파일
 * @param {string} assignmentId - 과제 ID
 * @param {string} studentId - 학생 ID
 * @returns {Promise<{file_url: string, file_name: string, file_size: number, file_type: string}>}
 */
export async function uploadAssignmentFile(file, assignmentId, studentId) {
  if (!file) {
    throw new Error('파일이 선택되지 않았습니다')
  }

  // 파일 크기 제한 (20MB)
  const MAX_FILE_SIZE = 20 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 20MB를 초과할 수 없습니다')
  }

  // 파일 확장자 추출
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `assignments/${assignmentId}/${studentId}/${fileName}`

  try {
    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('assignment-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('File upload error:', error)
      throw new Error('파일 업로드에 실패했습니다')
    }

    // 공개 URL 가져오기
    const { data: urlData } = supabase.storage
      .from('assignment-files')
      .getPublicUrl(filePath)

    return {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    }
  } catch (error) {
    console.error('Upload service error:', error)
    throw error
  }
}

/**
 * 강의 자료 파일 업로드 (기존 materials 시스템과 동일)
 * @param {File} file - 업로드할 파일
 * @param {string} courseId - 강의 ID
 * @param {string} uploaderId - 업로더 ID
 * @returns {Promise<{file_url: string, file_name: string, file_size: number, file_type: string}>}
 */
export async function uploadCourseMaterial(file, courseId, uploaderId) {
  if (!file) {
    throw new Error('파일이 선택되지 않았습니다')
  }

  // 파일 크기 제한 (50MB)
  const MAX_FILE_SIZE = 50 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 50MB를 초과할 수 없습니다')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `courses/${courseId}/${fileName}`

  try {
    const { data, error } = await supabase.storage
      .from('course-materials')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('File upload error:', error)
      throw new Error('파일 업로드에 실패했습니다')
    }

    const { data: urlData } = supabase.storage
      .from('course-materials')
      .getPublicUrl(filePath)

    return {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    }
  } catch (error) {
    console.error('Upload service error:', error)
    throw error
  }
}

/**
 * 파일 삭제
 * @param {string} fileUrl - 삭제할 파일 URL
 * @param {string} bucketName - 버킷 이름 ('assignment-files' 또는 'course-materials')
 * @returns {Promise<boolean>}
 */
export async function deleteFile(fileUrl, bucketName = 'assignment-files') {
  try {
    // URL에서 파일 경로 추출
    const urlParts = fileUrl.split(`/${bucketName}/`)
    if (urlParts.length < 2) {
      throw new Error('잘못된 파일 URL입니다')
    }

    const filePath = urlParts[1]

    const { error } = await supabase.storage.from(bucketName).remove([filePath])

    if (error) {
      console.error('File delete error:', error)
      throw new Error('파일 삭제에 실패했습니다')
    }

    return true
  } catch (error) {
    console.error('Delete service error:', error)
    throw error
  }
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
