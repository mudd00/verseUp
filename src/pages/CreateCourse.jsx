import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { courseService } from '@/services/courseService.js'
import { classroomService } from '@/services/classroomService.js'
import { ROUTES } from '@/utils/constants.js'

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

export default function CreateCourse() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [classrooms, setClassrooms] = useState([])
  const [allTimeSlots, setAllTimeSlots] = useState([]) // 강의실의 모든 시간표
  const [availableSlots, setAvailableSlots] = useState([]) // 가용 시간표 (시작일/주차 입력 후)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [showAvailability, setShowAvailability] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classroomId: '',
    timeSlotId: '',
    weeks: 4,
    maxStudents: 20,
    startDate: '',
    thumbnail: '',
    price: 0,
  })

  // 강의실 목록 로드
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const data = await classroomService.getClassrooms()
        setClassrooms(data)
      } catch (err) {
        console.error('강의실 목록 조회 실패:', err)
        toast.error('강의실 목록을 불러오는데 실패했습니다.')
      }
    }

    fetchClassrooms()
  }, [])

  // 강의실 선택 시 해당 강의실의 모든 시간표 로드
  useEffect(() => {
    const fetchClassroomTimeSlots = async () => {
      if (!formData.classroomId) {
        setAllTimeSlots([])
        setAvailableSlots([])
        setShowAvailability(false)
        return
      }

      setLoadingSlots(true)
      try {
        const classroom = await classroomService.getClassroom(formData.classroomId)
        setAllTimeSlots(classroom.timeSlots || [])
        setShowAvailability(false)
      } catch (err) {
        console.error('시간표 조회 실패:', err)
        toast.error('시간표를 불러오는데 실패했습니다.')
        setAllTimeSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchClassroomTimeSlots()
  }, [formData.classroomId])

  // 시작일/주차 입력 시 가용성 확인
  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.classroomId || !formData.startDate || !formData.weeks) {
        setShowAvailability(false)
        setAvailableSlots([])
        return
      }

      setLoadingSlots(true)
      try {
        const slots = await classroomService.getAvailableSlots(
          formData.classroomId,
          formData.startDate,
          formData.weeks
        )
        setAvailableSlots(slots)
        setShowAvailability(true)

        // 선택한 시간대가 사용 불가능한지 확인 (이미 선택한 경우)
        if (formData.timeSlotId) {
          const selectedSlot = slots.find(s => s.id === formData.timeSlotId)
          if (selectedSlot && !selectedSlot.isAvailable) {
            toast.error('선택한 시간대는 해당 기간에 사용할 수 없습니다. 다른 시간을 선택해주세요.')
            // 자동으로 timeSlotId 초기화
            setFormData(prev => ({ ...prev, timeSlotId: '' }))
          }
        }
      } catch (err) {
        console.error('가용성 확인 실패:', err)
        setShowAvailability(false)
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    checkAvailability()
  }, [formData.classroomId, formData.startDate, formData.weeks])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]:
          name === 'maxStudents' || name === 'weeks' ? Number(value) : value,
      }

      // 강의실이 변경되면 timeSlotId 초기화
      if (name === 'classroomId') {
        newData.timeSlotId = ''
      }

      // 시작일이 변경되면 요일이 바뀌므로 timeSlotId 초기화
      if (name === 'startDate' && prev.timeSlotId) {
        const oldDate = prev.startDate ? new Date(prev.startDate).getDay() : null
        const newDate = value ? new Date(value).getDay() : null

        // 요일이 바뀌면 시간대 초기화
        if (oldDate !== newDate) {
          newData.timeSlotId = ''
        }
      }

      return newData
    })
  }

  const handlePriceChange = (e) => {
    const value = e.target.value
    const numericValue = value.replace(/,/g, '').replace(/[^0-9]/g, '')

    if (numericValue === '') {
      setFormData((prev) => ({ ...prev, price: 0 }))
    } else {
      setFormData((prev) => ({ ...prev, price: Number(numericValue) }))
    }
  }

  const formatPrice = (price) => {
    if (price === 0) return ''
    return price.toLocaleString()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    try {
      // 필수 필드 검증
      if (!formData.title || !formData.description) {
        throw new Error('강의명과 설명은 필수입니다.')
      }

      if (!formData.classroomId || !formData.timeSlotId) {
        throw new Error('강의실과 시간대를 선택해주세요.')
      }

      if (!formData.startDate) {
        throw new Error('시작일을 선택해주세요.')
      }

      // 주말 체크
      const dayOfWeek = getStartDateDayOfWeek()
      if (dayOfWeek === null) {
        throw new Error('주말에는 강의를 개설할 수 없습니다. 평일을 선택해주세요.')
      }

      if (formData.weeks < 1 || formData.weeks > 52) {
        throw new Error('주차는 1~52주 사이로 설정해주세요.')
      }

      // 가용성 재확인
      if (showAvailability) {
        const selectedSlot = availableSlots.find((s) => s.id === formData.timeSlotId)
        if (selectedSlot && !selectedSlot.isAvailable) {
          throw new Error(
            '선택한 시간대는 사용할 수 없습니다. 다른 시간을 선택해주세요.'
          )
        }
      }

      // 모든 검증을 통과하면 확인 모달 표시
      setShowConfirmModal(true)
    } catch (err) {
      console.error('검증 실패:', err)
      setError(err instanceof Error ? err.message : '입력 값을 확인해주세요.')
    }
  }

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false)
    setError(null)
    setIsLoading(true)

    try {
      // 강의 생성
      const course = await courseService.createCourse(formData)

      toast.success(`강의 "${course.title}"이(가) 생성되었습니다!`, {
        duration: 5000,
      })

      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      console.error('강의 생성 실패:', err)
      setError(err instanceof Error ? err.message : '강의 생성에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 시작일의 요일 계산 (0=일요일, 1=월요일, ..., 6=토요일)
  const getStartDateDayOfWeek = () => {
    if (!formData.startDate) return null
    const date = new Date(formData.startDate)
    const jsDay = date.getDay() // 0(일)~6(토)
    // DB의 day_of_week는 1(월)~5(금), 0은 일요일, 6은 토요일
    // jsDay: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
    // DB: 1=월, 2=화, 3=수, 4=목, 5=금
    if (jsDay === 0 || jsDay === 6) {
      // 주말
      return null
    }
    return jsDay // 1~5 (월~금)
  }

  const startDayOfWeek = getStartDateDayOfWeek()

  // 시간표를 표시할 때 사용할 슬롯 (가용성 확인 전에는 모든 시간표, 후에는 가용성 포함)
  const displaySlots = showAvailability ? availableSlots : allTimeSlots

  // 시작일의 요일에 해당하는 시간대만 필터링
  const filteredSlots = startDayOfWeek !== null
    ? displaySlots.filter(slot => slot.day_of_week === startDayOfWeek)
    : displaySlots

  // 요일별로 시간표 그룹화
  const groupedTimeSlots = filteredSlots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = []
    }
    acc[slot.day_of_week].push(slot)
    return acc
  }, {})

  // 선택한 시간대가 사용 불가능한지 확인
  const isSelectedSlotUnavailable = () => {
    if (!formData.timeSlotId || !showAvailability) return false
    const selectedSlot = availableSlots.find(s => s.id === formData.timeSlotId)
    return selectedSlot && !selectedSlot.isAvailable
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">새 강의 개설</h1>
        <p className="text-gray-400">
          강의실과 시간표를 선택하여 새로운 강의를 생성하세요
        </p>
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
                최대 수강 인원
              </label>
              <input
                type="number"
                name="maxStudents"
                value={formData.maxStudents}
                onChange={handleChange}
                min="1"
                max="20"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <p className="text-sm text-gray-400 mt-1">
                최대 20명까지 설정 가능합니다
              </p>
            </div>
          </div>
        </div>

        {/* 강의실 및 시간표 선택 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">강의실 및 시간표 선택</h2>

          <div className="space-y-6">
            {/* Step 1: 강의실 선택 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm mr-2">
                  1
                </span>
                강의실 선택 <span className="text-red-400">*</span>
              </label>
              <select
                name="classroomId"
                value={formData.classroomId}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">강의실을 선택하세요</option>
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} (정원: {classroom.capacity}명)
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: 시작일 */}
            {formData.classroomId && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm mr-2">
                    2
                  </span>
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

                {/* 선택한 날짜의 요일 표시 */}
                {formData.startDate && (
                  <div className="mt-2">
                    {startDayOfWeek !== null ? (
                      <div className="p-3 bg-blue-900/20 border border-blue-500 rounded-lg">
                        <p className="text-sm text-blue-300">
                          📅 선택한 날짜: <span className="font-semibold">{DAYS_OF_WEEK[startDayOfWeek]}</span>
                        </p>
                        <p className="text-xs text-blue-400 mt-1">
                          이 요일의 시간대만 선택할 수 있습니다
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg">
                        <p className="text-sm text-red-300">
                          ⚠️ 주말은 강의를 개설할 수 없습니다
                        </p>
                        <p className="text-xs text-red-400 mt-1">
                          월요일부터 금요일 사이의 날짜를 선택해주세요
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: 주차 수 */}
            {formData.classroomId && formData.startDate && startDayOfWeek !== null && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm mr-2">
                    3
                  </span>
                  주차 수 <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  name="weeks"
                  value={formData.weeks}
                  onChange={handleChange}
                  min="1"
                  max="52"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="text-sm text-gray-400 mt-1">
                  강의가 진행될 주차 수를 입력하세요 (1~52주)
                </p>
              </div>
            )}

            {/* Step 4: 시간표 선택 (시작일과 주차 입력 후 표시) */}
            {formData.classroomId && formData.startDate && formData.weeks && startDayOfWeek !== null && (
              <div>
                <label className="block text-sm font-medium mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm mr-2">
                    4
                  </span>
                  수업 시간대 선택 <span className="text-red-400">*</span>
                </label>

                {loadingSlots ? (
                  <div className="text-center py-8 text-gray-400">
                    가용 시간대를 확인하는 중...
                  </div>
                ) : !showAvailability ? (
                  <div className="text-center py-8 text-gray-400">
                    시간대 정보를 불러오는 중...
                  </div>
                ) : filteredSlots.length === 0 ? (
                  <div className="text-center py-8 text-red-400">
                    <p className="mb-2">선택한 기간에 사용 가능한 시간대가 없습니다</p>
                    <p className="text-sm text-gray-400">
                      다른 날짜나 기간을 선택해주세요
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500 rounded-lg">
                      <p className="text-sm text-blue-300">
                        💡 <span className="font-semibold">{DAYS_OF_WEEK[startDayOfWeek]}</span> {formData.startDate}부터 {formData.weeks}주간 사용 가능한 시간대입니다
                      </p>
                      <p className="text-xs text-blue-400 mt-1">
                        매주 {DAYS_OF_WEEK[startDayOfWeek]}에 수업이 진행됩니다
                      </p>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(groupedTimeSlots).map(
                        ([dayOfWeek, slots]) => (
                          <div
                            key={dayOfWeek}
                            className="bg-gray-700/50 p-4 rounded-lg"
                          >
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                              {DAYS_OF_WEEK[dayOfWeek]}
                              <span className="text-xs text-gray-400">
                                ({slots.length}개 시간대)
                              </span>
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                              {slots.map((slot) => {
                                const isSelected = formData.timeSlotId === slot.id
                                const isUnavailable = !slot.isAvailable

                                return (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        timeSlotId: slot.id,
                                      }))
                                    }
                                    disabled={isUnavailable}
                                    className={`
                                      px-4 py-3 rounded-lg border-2 transition
                                      ${
                                        isSelected
                                          ? 'border-blue-500 bg-blue-600/20 ring-2 ring-blue-500/50'
                                          : isUnavailable
                                            ? 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                                            : 'border-gray-600 hover:border-blue-400 bg-gray-700'
                                      }
                                    `}
                                  >
                                    <div className="text-sm font-semibold">
                                      {TIME_SLOT_DISPLAY[slot.slot_order]}
                                    </div>
                                    {isUnavailable && (
                                      <div className="text-xs text-red-400 mt-1">
                                        사용 불가
                                      </div>
                                    )}
                                    {isSelected && (
                                      <div className="text-xs text-blue-400 mt-1">
                                        선택됨
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}

                {isSelectedSlotUnavailable() && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
                    <p className="text-sm text-red-300">
                      ⚠️ 선택한 시간대는 해당 기간에 다른 강의가 예약되어 있습니다. 다른 시간을 선택해주세요.
                    </p>
                  </div>
                )}
              </div>
            )}

            {formData.timeSlotId && formData.startDate && formData.weeks && (
              <div className="p-4 bg-green-900/20 border border-green-500 rounded-lg">
                <p className="text-sm text-green-300">
                  ✓ 선택한 시간대로 매주 {formData.weeks}주간 수업이 진행됩니다
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 가격 및 썸네일 */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">추가 설정</h2>

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
                0원으로 설정하면 무료 강의입니다
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
            disabled={isLoading || isSelectedSlotUnavailable() || startDayOfWeek === null}
          >
            {isLoading ? '생성 중...' : '강의 생성'}
          </button>
        </div>
      </form>

      {/* 확인 모달 */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-2xl font-bold mb-2">강의 생성 최종 확인</h3>
                <p className="text-gray-300">
                  아래 정보는 생성 후 변경할 수 없습니다. 신중히 확인해주세요.
                </p>
              </div>
            </div>

            {/* 변경 불가능한 항목 강조 표시 */}
            <div className="bg-yellow-900/20 border-2 border-yellow-500 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <h4 className="font-semibold text-yellow-200">
                  생성 후 변경 불가능한 항목
                </h4>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">강의실:</div>
                  <div className="font-medium">
                    {classrooms.find((c) => c.id === formData.classroomId)?.name ||
                      '선택됨'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">수업 시간:</div>
                  <div className="font-medium">
                    {(() => {
                      const selectedSlot = displaySlots.find(
                        (s) => s.id === formData.timeSlotId
                      )
                      if (selectedSlot) {
                        return `${DAYS_OF_WEEK[selectedSlot.day_of_week]} ${TIME_SLOT_DISPLAY[selectedSlot.slot_order]}`
                      }
                      return '선택됨'
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">시작일:</div>
                  <div className="font-medium">{formData.startDate}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">주차 수:</div>
                  <div className="font-medium">{formData.weeks}주</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">최대 수강 인원:</div>
                  <div className="font-medium">{formData.maxStudents}명</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">가격:</div>
                  <div className="font-medium">
                    {formData.price === 0
                      ? '무료'
                      : `${formData.price.toLocaleString()}원`}
                  </div>
                </div>
              </div>
            </div>

            {/* 변경 가능한 항목 */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h4 className="font-semibold text-green-200">
                  생성 후 수정 가능한 항목
                </h4>
              </div>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">강의명:</div>
                  <div className="font-medium">{formData.title}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-400">강의 설명:</div>
                  <div className="font-medium line-clamp-2">
                    {formData.description}
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  * 강의 제목, 설명, 썸네일, 강의 자료는 생성 후에도 수정 가능합니다.
                </p>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                disabled={isLoading}
              >
                취소하고 수정
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? '생성 중...' : '확인 및 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
