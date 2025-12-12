import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { courseService } from '@/services/courseService.js'
import { classroomService } from '@/services/classroomService.js'
import { ROUTES } from '@/utils/constants.js'
import { useAuthStore } from '@/stores/authStore.js'
import CourseMaterials from '@/components/course/CourseMaterials.jsx'
import { AlertTriangle } from 'lucide-react'

const DAYS_OF_WEEK = {
  1: '월요일',
  2: '화요일',
  3: '수요일',
  4: '목요일',
  5: '금요일',
}

const TIME_SLOT_DISPLAY = {
  1: '09:00-10:40',
  2: '11:00-12:40',
  3: '13:00-14:40',
  4: '15:00-16:40',
  5: '17:00-18:40',
}

export default function EditCourse() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState(null)
  const [classroomName, setClassroomName] = useState('')
  const [timeSlotInfo, setTimeSlotInfo] = useState({ day: '', time: '' })

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseCode: '',
    classroomId: '',
    timeSlotId: '',
    weeks: 4,
    maxStudents: 20,
    startDate: '',
    thumbnail: '',
    price: 0,
    status: 'draft',
  })

  // 강의 정보 로드
  useEffect(() => {
    if (id) {
      loadCourse(id)
    }
  }, [id])

  const loadCourse = async (courseId) => {
    try {
      setIsFetching(true)
      const course = await courseService.getCourseById(courseId)

      console.log('로드된 강의 데이터:', course)

      // 날짜 형식 변환 (YYYY-MM-DD)
      const formatDateForInput = (dateString) => {
        return dateString.split('T')[0]
      }

      setFormData({
        title: course.title,
        description: course.description,
        courseCode: course.courseCode,
        classroomId: course.classroom?.id || '',
        timeSlotId: course.timeSlot?.id || '',
        weeks: course.weeks || 4,
        maxStudents: course.maxStudents || 20,
        startDate: formatDateForInput(course.startDate),
        thumbnail: course.thumbnail || '',
        price: course.price || 0,
        status: course.status || 'draft',
      })

      // 강의실 정보 설정 (이미 조인되어 있음)
      if (course.classroom) {
        setClassroomName(course.classroom.name)
      }

      // 시간표 정보 설정 (이미 조인되어 있음)
      if (course.timeSlot) {
        setTimeSlotInfo({
          day: DAYS_OF_WEEK[course.timeSlot.day_of_week] || '',
          time: TIME_SLOT_DISPLAY[course.timeSlot.slot_order] || '',
        })
      }
    } catch (err) {
      console.error('강의 로드 실패:', err)
      setError('강의를 불러오는데 실패했습니다.')
    } finally {
      setIsFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

      // 강의 업데이트 (수정 가능한 필드만)
      const updateData = {
        title: formData.title,
        description: formData.description,
        thumbnail: formData.thumbnail || undefined,
        status: formData.status,
      }

      const updatedCourse = await courseService.updateCourse(id, updateData)

      const statusText =
        updatedCourse.status === 'published'
          ? '공개'
          : updatedCourse.status === 'draft'
            ? '초안'
            : '보관됨'
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
        <p className="text-gray-400">
          강의 설명과 자료만 수정할 수 있습니다
        </p>
      </div>

      {/* 안내 메시지 */}
      <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-200">
          <p className="font-semibold mb-1">수정 제한 안내</p>
          <p>
            강의실, 시간표, 수강 인원, 가격, 시작일, 주차 수는 생성 후 변경할 수
            없습니다.
            <br />
            강의 제목, 설명, 썸네일, 강의 자료만 수정 가능합니다.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 수정 가능한 정보 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">강의 정보 (수정 가능)</h2>

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
                초안: 비공개 | 공개: 모든 사용자 표시
              </p>
            </div>
          </div>
        </div>

        {/* 변경 불가능한 정보 */}
        <div className="bg-gray-800 p-6 rounded-lg border-2 border-gray-600">
          <h2 className="text-2xl font-semibold mb-2">
            강의 세부 정보 (변경 불가)
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            아래 정보는 강의 생성 시 설정된 값으로 변경할 수 없습니다
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  수강번호
                </label>
                <input
                  type="text"
                  value={formData.courseCode}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  강의실
                </label>
                <input
                  type="text"
                  value={classroomName}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  수업 요일
                </label>
                <input
                  type="text"
                  value={timeSlotInfo.day}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  수업 시간
                </label>
                <input
                  type="text"
                  value={timeSlotInfo.time}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  시작일
                </label>
                <input
                  type="text"
                  value={formData.startDate}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  주차 수
                </label>
                <input
                  type="text"
                  value={`${formData.weeks}주`}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  최대 수강 인원
                </label>
                <input
                  type="text"
                  value={`${formData.maxStudents}명`}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  가격
                </label>
                <input
                  type="text"
                  value={
                    formData.price === 0
                      ? '무료'
                      : `${formData.price.toLocaleString()}원`
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  readOnly
                  disabled
                />
              </div>
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

      {/* 강의 자료 관리 */}
      <div className="mt-8">
        <CourseMaterials
          courseId={id}
          isInstructor={user?.role === 'instructor'}
        />
      </div>
    </div>
  )
}
