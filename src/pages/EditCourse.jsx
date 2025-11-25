import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { courseService } from '@/services/courseService.js'
import { ROUTES } from '@/utils/constants.js'

import ScheduleInput from '@/components/course/ScheduleInput.jsx'

export default function EditCourse() {
  const { id } = useParams<{ id }>()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseCode: '',
    category: 'general',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    maxStudents: 30,
    startDate: '',
    endDate: '',
    schedule: [] as CourseSchedule[],
    thumbnail: '',
    price: 0,
    status: 'draft' as 'draft' | 'published' | 'archived',
  })

  const handleScheduleChange = (schedules) => {
    setFormData((prev) => ({ ...prev, schedule: schedules }))
  }

  useEffect(() => {
    if (id) {
      loadCourse(id)
    }
  }, [id])

  const loadCourse = async (courseId) => {
    try {
      setIsFetching(true)
      const course = await courseService.getCourseById(courseId)

      // 날짜 형식 변환 (YYYY-MM-DD)
      const formatDateForInput = (dateString) => {
        return dateString.split('T')[0]
      }

      setFormData({
        title: course.title,
        description: course.description,
        courseCode: course.courseCode,
        category: course.category || 'general',
        level: course.level || 'beginner',
        maxStudents: course.maxStudents,
        startDate: formatDateForInput(course.startDate),
        endDate: formatDateForInput(course.endDate),
        schedule: course.schedule || [],
        thumbnail: course.thumbnail || '',
        price: course.price || 0,
        status: course.status || 'draft',
      })
    } catch (err) {
      console.error('강의 로드 실패:', err)
      setError('강의를 불러오는데 실패했습니다.')
    } finally {
      setIsFetching(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'maxStudents' || name === 'price' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!id) {
        throw new Error('강의 ID가 없습니다.')
      }

      // 필수 필드 검증
      if (!formData.title || !formData.description) {
        throw new Error('강의명과 설명은 필수입니다.')
      }

      if (!formData.startDate || !formData.endDate) {
        throw new Error('시작일과 종료일은 필수입니다.')
      }

      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        throw new Error('종료일은 시작일보다 나중이어야 합니다.')
      }

      // 강의 업데이트
      const updateData: UpdateCourseData = {
        title: formData.title,
        description: formData.description,
        courseCode: formData.courseCode,
        category: formData.category,
        level: formData.level,
        maxStudents: formData.maxStudents,
        startDate: formData.startDate,
        endDate: formData.endDate,
        schedule: formData.schedule,
        thumbnail: formData.thumbnail || undefined,
        price: formData.price,
        status: formData.status,
      }

      const updatedCourse = await courseService.updateCourse(id, updateData)

      // 성공 토스트
      const statusText = updatedCourse.status === 'published' ? '공개' : updatedCourse.status === 'draft' ? '초안' : '보관됨'
      toast.success(
        `강의 "${updatedCourse.title}"이(가) 수정되었습니다!\n상태: ${statusText}`,
        {
          duration: 5000,
        }
      )

      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      console.error('강의 수정 실패:', err)
      setError(
        err instanceof Error ? err.message : '강의 수정에 실패했습니다.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-400">강의 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">강의 수정</h1>
        <p className="text-gray-400">강의 정보를 수정하세요</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">기본 정보</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                강의명 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                수강번호
              </label>
              <input
                type="text"
                name="courseCode"
                value={formData.courseCode}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                readOnly
              />
              <p className="text-sm text-gray-400 mt-1">
                수강번호는 수정할 수 없습니다
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                강의 설명 <span className="text-red-400">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 min-h-[120px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  카테고리
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="general">일반</option>
                  <option value="programming">프로그래밍</option>
                  <option value="design">디자인</option>
                  <option value="business">비즈니스</option>
                  <option value="math">수학</option>
                  <option value="science">과학</option>
                  <option value="language">언어</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">난이도</label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="beginner">초급</option>
                  <option value="intermediate">중급</option>
                  <option value="advanced">고급</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  최대 수강 인원
                </label>
                <input
                  type="number"
                  name="maxStudents"
                  value={formData.maxStudents}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  min="1"
                  max="500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                강의 상태
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="draft">초안 (비공개)</option>
                <option value="published">공개</option>
                <option value="archived">보관</option>
              </select>
              <p className="text-sm text-gray-400 mt-1">
                초안: 강의 목록에 표시되지 않음 | 공개: 모든 사용자에게 표시 | 보관: 더 이상 수강 신청 불가
              </p>
            </div>
          </div>
        </div>

        {/* 기간 및 시간표 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">기간 및 시간표</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  시작일 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  종료일 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* 강의 시간표 */}
            <ScheduleInput
              schedules={formData.schedule}
              onChange={handleScheduleChange}
            />
          </div>
        </div>

        {/* 가격 설정 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">가격 설정</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                가격 (원)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                썸네일 URL
              </label>
              <input
                type="url"
                name="thumbnail"
                value={formData.thumbnail}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? '수정 중...' : '수정 완료'}
          </button>
        </div>
      </form>
    </div>
  )
}
