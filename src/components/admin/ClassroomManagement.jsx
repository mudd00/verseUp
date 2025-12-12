import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, DoorOpen, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_LABELS = {
  active: '사용 중',
  inactive: '비활성',
}

const STATUS_COLORS = {
  active: 'bg-green-600/20 text-green-400',
  inactive: 'bg-gray-600/20 text-gray-400',
}

const DAY_LABELS = {
  0: '월요일',
  1: '화요일',
  2: '수요일',
  3: '목요일',
  4: '금요일',
  5: '토요일',
  6: '일요일',
}

export default function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingClassroom, setEditingClassroom] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: 20,
  })

  // 시간표 슬롯 관리 상태
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false)
  const [selectedClassroom, setSelectedClassroom] = useState(null)
  const [timeSlots, setTimeSlots] = useState([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [showSlotFormModal, setShowSlotFormModal] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const [slotFormData, setSlotFormData] = useState({
    day_of_week: 0,
    start_time: '',
    end_time: '',
    slot_order: 0,
  })

  useEffect(() => {
    loadClassrooms()
  }, [])

  const loadClassrooms = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/classrooms', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch classrooms')
      }

      const data = await response.json()
      setClassrooms(data.classrooms || [])
    } catch (error) {
      console.error('강의실 목록 로드 실패:', error)
      toast.error('강의실 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (classroom = null) => {
    if (classroom) {
      setEditingClassroom(classroom)
      setFormData({
        name: classroom.name,
        description: classroom.description || '',
        capacity: classroom.capacity,
      })
    } else {
      setEditingClassroom(null)
      setFormData({
        name: '',
        description: '',
        capacity: 20,
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingClassroom(null)
    setFormData({
      name: '',
      description: '',
      capacity: 20,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name) {
      toast.error('강의실 이름을 입력해주세요.')
      return
    }

    try {
      const url = editingClassroom
        ? `/api/admin/classrooms/${editingClassroom.id}`
        : '/api/admin/classrooms'

      const method = editingClassroom ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to save classroom')
      }

      toast.success(
        editingClassroom
          ? '강의실이 수정되었습니다.'
          : '강의실이 생성되었습니다.'
      )
      handleCloseModal()
      loadClassrooms()
    } catch (error) {
      console.error('강의실 저장 실패:', error)
      toast.error('강의실 저장에 실패했습니다.')
    }
  }

  const handleDelete = async (classroomId, activeCoursesCount) => {
    if (activeCoursesCount > 0) {
      toast.error(
        `사용 중인 강의가 ${activeCoursesCount}개 있어 삭제할 수 없습니다.`
      )
      return
    }

    if (!confirm('정말로 이 강의실을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/classrooms/${classroomId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete classroom')
      }

      toast.success('강의실이 삭제되었습니다.')
      loadClassrooms()
    } catch (error) {
      console.error('강의실 삭제 실패:', error)
      toast.error(error.message || '강의실 삭제에 실패했습니다.')
    }
  }

  // 시간표 슬롯 관리 함수들
  const handleOpenTimeSlotModal = async (classroom) => {
    setSelectedClassroom(classroom)
    setShowTimeSlotModal(true)
    await loadTimeSlots(classroom.id)
  }

  const loadTimeSlots = async (classroomId) => {
    try {
      setIsLoadingSlots(true)
      const response = await fetch(
        `/api/admin/classrooms/${classroomId}/time-slots`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch time slots')
      }

      const data = await response.json()
      setTimeSlots(data.timeSlots || [])
    } catch (error) {
      console.error('시간표 슬롯 로드 실패:', error)
      toast.error('시간표 슬롯을 불러오는데 실패했습니다.')
    } finally {
      setIsLoadingSlots(false)
    }
  }

  const handleOpenSlotFormModal = (slot = null) => {
    if (slot) {
      setEditingSlot(slot)
      setSlotFormData({
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_order: slot.slot_order,
      })
    } else {
      setEditingSlot(null)
      setSlotFormData({
        day_of_week: 0,
        start_time: '',
        end_time: '',
        slot_order: 0,
      })
    }
    setShowSlotFormModal(true)
  }

  const handleCloseSlotFormModal = () => {
    setShowSlotFormModal(false)
    setEditingSlot(null)
    setSlotFormData({
      day_of_week: 0,
      start_time: '',
      end_time: '',
      slot_order: 0,
    })
  }

  const handleSubmitSlot = async (e) => {
    e.preventDefault()

    if (!slotFormData.start_time || !slotFormData.end_time) {
      toast.error('시작 시간과 종료 시간을 입력해주세요.')
      return
    }

    try {
      const url = editingSlot
        ? `/api/admin/classrooms/${selectedClassroom.id}/time-slots/${editingSlot.id}`
        : `/api/admin/classrooms/${selectedClassroom.id}/time-slots`

      const method = editingSlot ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(slotFormData),
      })

      if (!response.ok) {
        throw new Error('Failed to save time slot')
      }

      toast.success(
        editingSlot
          ? '시간표 슬롯이 수정되었습니다.'
          : '시간표 슬롯이 추가되었습니다.'
      )
      handleCloseSlotFormModal()
      loadTimeSlots(selectedClassroom.id)
    } catch (error) {
      console.error('시간표 슬롯 저장 실패:', error)
      toast.error('시간표 슬롯 저장에 실패했습니다.')
    }
  }

  const handleDeleteSlot = async (slotId) => {
    if (!confirm('정말로 이 시간표 슬롯을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/admin/classrooms/${selectedClassroom.id}/time-slots/${slotId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete time slot')
      }

      toast.success('시간표 슬롯이 삭제되었습니다.')
      loadTimeSlots(selectedClassroom.id)
    } catch (error) {
      console.error('시간표 슬롯 삭제 실패:', error)
      toast.error('시간표 슬롯 삭제에 실패했습니다.')
    }
  }

  const activeCount = classrooms.filter((c) => c.status === 'active').length
  const inactiveCount = classrooms.filter((c) => c.status === 'inactive').length

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">강의실 관리</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          강의실 추가
        </button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">전체 강의실</p>
          <p className="text-2xl font-bold">{classrooms.length}개</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">사용 중</p>
          <p className="text-2xl font-bold text-green-400">{activeCount}개</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">비활성</p>
          <p className="text-2xl font-bold text-gray-400">{inactiveCount}개</p>
        </div>
      </div>

      {/* 강의실 테이블 */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  강의실명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  설명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  수용인원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  사용 중인 강의
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    로딩 중...
                  </td>
                </tr>
              ) : classrooms.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    강의실이 없습니다.
                  </td>
                </tr>
              ) : (
                classrooms.map((classroom) => (
                  <tr key={classroom.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DoorOpen className="w-4 h-4 text-blue-400" />
                        <span className="font-medium">{classroom.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-400 max-w-xs truncate">
                        {classroom.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{classroom.capacity}명</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {classroom.activeCoursesCount || 0}개
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[classroom.status] || 'bg-gray-600/20 text-gray-400'}`}
                      >
                        {STATUS_LABELS[classroom.status] || classroom.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenTimeSlotModal(classroom)}
                          className="p-1 hover:bg-gray-600 rounded transition"
                          title="시간표 관리"
                        >
                          <Clock className="w-4 h-4 text-purple-400" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(classroom)}
                          className="p-1 hover:bg-gray-600 rounded transition"
                          title="수정"
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(
                              classroom.id,
                              classroom.activeCoursesCount
                            )
                          }
                          className="p-1 hover:bg-gray-600 rounded transition"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 강의실 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingClassroom ? '강의실 수정' : '강의실 추가'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  강의실명 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: 101호"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">설명</label>
                <textarea
                  placeholder="강의실 설명을 입력하세요"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  수용인원 <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  placeholder="20"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="1"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  {editingClassroom ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
