import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { courseService } from '@/services/courseService.js'
import { ROUTES } from '@/utils/constants.js'
import ScheduleInput from '@/components/course/ScheduleInput.jsx'

export default function CreateCourse() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseCode: '',
    category: 'general',
    level: 'beginner',
    maxStudents: 20,
    startDate: '',
    endDate: '',
    schedule: [],
    thumbnail: '',
    price: 0,
  })

  const handleScheduleChange = (schedules) => {
    setFormData((prev) => ({ ...prev, schedule: schedules }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'maxStudents' ? Number(value) : value,
    }))
  }

  // 가격 입력 처리 (쉼표 포맷팅)
  const handlePriceChange = (e) => {
    const value = e.target.value
    // 쉼표 제거하고 숫자만 추출
    const numericValue = value.replace(/,/g, '').replace(/[^0-9]/g, '')

    // 빈 값이면 0으로 설정
    if (numericValue === '') {
      setFormData((prev) => ({ ...prev, price: 0 }))
    } else {
      setFormData((prev) => ({ ...prev, price: Number(numericValue) }))
    }
  }

  // 가격을 쉼표 포맷으로 표시
  const formatPrice = (price) => {
    if (price === 0) return ''
    return price.toLocaleString()
  }

  // 최대 수강 인원 입력 처리
  const handleMaxStudentsChange = (e) => {
    const value = e.target.value
    // 숫자만 추출
    const numericValue = value.replace(/[^0-9]/g, '')

    // 빈 값이면 1로 설정 (최소값)
    if (numericValue === '') {
      setFormData((prev) => ({ ...prev, maxStudents: 1 }))
    } else {
      const num = Number(numericValue)
      // 20명 초과 시 20으로 제한
      const limitedNum = Math.min(num, 20)
      setFormData((prev) => ({ ...prev, maxStudents: limitedNum }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
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

      // 강의 생성
      const course = await courseService.createCourse(formData)

      // 성공 토스트
      toast.success(
        `강의 "${course.title}"이(가) 생성되었습니다!\n강의코드: ${course.courseCode}`,
        {
          duration: 5000,
        }
      )

      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      console.error('강의 생성 실패:', err)
      setError(
        err instanceof Error ? err.message : '강의 생성에 실패했습니다.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">새 강의 개설</h1>
        <p className="text-gray-400">새로운 강의를 생성하고 학생들을 모집하세요</p>
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
                placeholder="예: React 완벽 가이드"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                수강번호 (선택사항)
              </label>
              <input
                type="text"
                name="courseCode"
                value={formData.courseCode}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="비워두면 자동 생성됩니다 (예: REA123)"
              />
              <p className="text-sm text-gray-400 mt-1">
                비워두면 강의명을 기반으로 자동 생성됩니다
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
                placeholder="강의에 대한 자세한 설명을 입력하세요"
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
                  type="text"
                  name="maxStudents"
                  value={formData.maxStudents}
                  onChange={handleMaxStudentsChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="최대 20명"
                  required
                />
                <p className="text-sm text-gray-400 mt-1">
                  최대 20명까지 설정 가능합니다
                </p>
              </div>
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
              schedules={formData.schedule || []}
              onChange={handleScheduleChange}
            />
          </div>
        </div>

        {/* 가격 및 썸네일 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">가격 설정</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                가격 (원)
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="price"
                  value={formatPrice(formData.price)}
                  onChange={handlePriceChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="0 (무료)"
                />
                {formData.price > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    원
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                0원으로 설정하면 무료 강의입니다 (예: 50,000)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                썸네일 URL (선택사항)
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
            {isLoading ? '생성 중...' : '강의 생성'}
          </button>
        </div>
      </form>
    </div>
  )
}
