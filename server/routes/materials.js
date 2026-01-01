import { Router } from 'express'
import multer from 'multer'
import { authMiddleware, requireInstructor } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

// Multer 설정 (메모리 스토리지 사용)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
})

// Get all materials for a course
// 수강 중인 학생 또는 강사만 조회 가능
router.get('/courses/:courseId/materials', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.user.id

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // Check if user is enrolled or is the instructor (admin can see all)
    if (req.user.role !== 'admin') {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('instructor_id')
        .eq('id', courseId)
        .single()

      if (courseError || !course) {
        return res.status(404).json({ error: 'Course not found' })
      }

      // If not the instructor, check enrollment
      if (course.instructor_id !== userId) {
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('student_id', userId)
          .eq('status', 'active')
          .maybeSingle()

        if (enrollmentError) {
          console.error('Error checking enrollment:', enrollmentError)
          return res.status(500).json({ error: 'Failed to verify enrollment' })
        }

        if (!enrollment) {
          return res.status(403).json({ error: 'Only enrolled students can view course materials' })
        }
      }
    }

    // Fetch materials from database
    const { data: materials, error } = await supabase
      .from('course_materials')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching materials:', error)
      return res.status(500).json({ error: 'Failed to fetch materials' })
    }

    res.json({ materials: materials || [] })
  } catch (error) {
    console.error('Error in GET /courses/:courseId/materials:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Upload a material with file (백엔드에서 Supabase Storage에 업로드)
// 강사 또는 관리자만 업로드 가능
router.post(
  '/courses/:courseId/materials/upload',
  authMiddleware,
  requireInstructor,
  upload.single('file'),
  async (req, res) => {
    try {
      const { courseId } = req.params
      const { title, description, week_number } = req.body
      const file = req.file

      if (!supabase) {
        return res.status(503).json({ error: 'Database service unavailable' })
      }

      // Validate required fields
      if (!title || !file) {
        return res.status(400).json({ error: 'Title and file are required' })
      }

      // Verify user is the instructor of this course (관리자는 모든 강의에 업로드 가능)
      if (req.user.role !== 'admin') {
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('instructor_id')
          .eq('id', courseId)
          .single()

        if (courseError || !course) {
          return res.status(404).json({ error: 'Course not found' })
        }

        if (course.instructor_id !== req.user.id) {
          return res.status(403).json({ error: 'Only the course instructor can upload materials' })
        }
      }

      // Generate unique file path
      const fileExt = file.originalname.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${courseId}/${fileName}`

      // Upload file to Supabase Storage (Service Role Key - RLS 우회)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return res.status(500).json({ error: 'Failed to upload file to storage' })
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('course-materials').getPublicUrl(filePath)

      // Insert material metadata
      const { data: material, error: insertError } = await supabase
        .from('course_materials')
        .insert({
          course_id: courseId,
          title,
          description: description || null,
          file_url: publicUrl,
          file_name: file.originalname,
          file_size: file.size,
          file_type: file.mimetype,
          week_number: week_number ? parseInt(week_number) : null,
          uploaded_by: req.user.id,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting material:', insertError)
        // 파일은 이미 업로드되었으므로 삭제 시도
        await supabase.storage.from('course-materials').remove([filePath])
        return res.status(500).json({ error: 'Failed to save material metadata' })
      }

      res.status(201).json({ material })
    } catch (error) {
      console.error('Error in POST /courses/:courseId/materials/upload:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Download a material (강제 다운로드 - 서버 프록시 방식)
// 수강 중인 학생, 강사, 관리자만 다운로드 가능
router.get(
  '/courses/:courseId/materials/:materialId/download',
  authMiddleware,
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params
      const userId = req.user.id

      if (!supabase) {
        return res.status(503).json({ error: 'Database service unavailable' })
      }

      // Check if user is enrolled or is the instructor (admin can download all)
      if (req.user.role !== 'admin') {
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('instructor_id')
          .eq('id', courseId)
          .single()

        if (courseError || !course) {
          return res.status(404).json({ error: 'Course not found' })
        }

        // If not the instructor, check enrollment
        if (course.instructor_id !== userId) {
          const { data: enrollment, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('id')
            .eq('course_id', courseId)
            .eq('student_id', userId)
            .eq('status', 'active')
            .maybeSingle()

          if (enrollmentError) {
            console.error('Error checking enrollment:', enrollmentError)
            return res.status(500).json({ error: 'Failed to verify enrollment' })
          }

          if (!enrollment) {
            return res.status(403).json({ error: 'Only enrolled students can download course materials' })
          }
        }
      }

      // Fetch material to get file info
      const { data: material, error: fetchError } = await supabase
        .from('course_materials')
        .select('*')
        .eq('id', materialId)
        .eq('course_id', courseId)
        .single()

      if (fetchError || !material) {
        return res.status(404).json({ error: 'Material not found' })
      }

      // Extract file path from URL
      // URL format: https://{project}.supabase.co/storage/v1/object/public/course-materials/{path}
      const urlParts = material.file_url.split('/course-materials/')
      const filePath = urlParts[1]

      if (!filePath) {
        return res.status(500).json({ error: 'Invalid file path' })
      }

      // Create signed URL to download the file
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('course-materials')
        .createSignedUrl(filePath, 60)

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError)
        return res.status(500).json({ error: 'Failed to generate download link' })
      }

      // Fetch file from signed URL
      const fileResponse = await fetch(signedUrlData.signedUrl)
      if (!fileResponse.ok) {
        console.error('Error fetching file:', fileResponse.status)
        return res.status(500).json({ error: 'Failed to download file' })
      }

      // RFC 5987 인코딩으로 한글 파일명 처리
      const fileName = material.file_name
      const encodedFileName = encodeURIComponent(fileName).replace(/['()]/g, escape)
      // filename= 에는 ASCII만 허용되므로 fallback으로 "download" 또는 확장자만 사용
      const fileExt = fileName.includes('.') ? fileName.split('.').pop() : ''
      const fallbackName = fileExt ? `download.${fileExt}` : 'download'
      const contentDisposition = `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedFileName}`

      // Set headers
      res.setHeader('Content-Type', material.file_type || 'application/octet-stream')
      res.setHeader('Content-Disposition', contentDisposition)
      res.setHeader('Content-Length', material.file_size)

      // Stream the response
      const arrayBuffer = await fileResponse.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      res.send(buffer)
    } catch (error) {
      console.error('Error in GET /courses/:courseId/materials/:materialId/download:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Delete a material
// 강사 또는 관리자만 삭제 가능
router.delete(
  '/courses/:courseId/materials/:materialId',
  authMiddleware,
  requireInstructor,
  async (req, res) => {
    try {
      const { courseId, materialId } = req.params

      if (!supabase) {
        return res.status(503).json({ error: 'Database service unavailable' })
      }

      // Fetch material to get file_url and verify ownership
      const { data: material, error: fetchError } = await supabase
        .from('course_materials')
        .select('*, courses!inner(instructor_id)')
        .eq('id', materialId)
        .eq('course_id', courseId)
        .single()

      if (fetchError || !material) {
        return res.status(404).json({ error: 'Material not found' })
      }

      // 관리자는 모든 자료 삭제 가능, 강사는 본인 강의만
      if (req.user.role !== 'admin' && material.courses.instructor_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the course instructor can delete materials' })
      }

      // Extract file path from URL
      // URL format: https://{project}.supabase.co/storage/v1/object/public/course-materials/{path}
      const urlParts = material.file_url.split('/course-materials/')
      const filePath = urlParts[1]

      if (filePath) {
        // Delete file from storage
        const { error: storageError } = await supabase.storage
          .from('course-materials')
          .remove([filePath])

        if (storageError) {
          console.error('Error deleting file from storage:', storageError)
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete material from database
      const { error: deleteError } = await supabase
        .from('course_materials')
        .delete()
        .eq('id', materialId)

      if (deleteError) {
        console.error('Error deleting material:', deleteError)
        return res.status(500).json({ error: 'Failed to delete material' })
      }

      res.json({ message: 'Material deleted successfully' })
    } catch (error) {
      console.error(
        'Error in DELETE /courses/:courseId/materials/:materialId:',
        error
      )
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
