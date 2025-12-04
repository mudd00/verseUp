import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { supabase } from '../utils/supabase.js'

const router = Router()

// Get all materials for a course
router.get('/courses/:courseId/materials', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
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

// Upload a material (metadata only - file upload happens on client)
router.post('/courses/:courseId/materials', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params
    const { title, description, file_url, file_name, file_size, file_type } =
      req.body

    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' })
    }

    // Validate required fields
    if (!title || !file_url || !file_name || !file_size || !file_type) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Verify user is the instructor of this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    if (course.instructor_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: 'Only the instructor can upload materials' })
    }

    // Insert material metadata
    const { data: material, error: insertError } = await supabase
      .from('course_materials')
      .insert({
        course_id: courseId,
        title,
        description: description || null,
        file_url,
        file_name,
        file_size,
        file_type,
        uploaded_by: req.user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting material:', insertError)
      return res.status(500).json({ error: 'Failed to save material' })
    }

    res.status(201).json({ material })
  } catch (error) {
    console.error('Error in POST /courses/:courseId/materials:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete a material
router.delete(
  '/courses/:courseId/materials/:materialId',
  authMiddleware,
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

      if (material.courses.instructor_id !== req.user.id) {
        return res
          .status(403)
          .json({ error: 'Only the instructor can delete materials' })
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
