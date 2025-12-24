import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { attendanceService } from '@/services/attendanceService'

const STATUS_OPTIONS = [
  { value: 'present', label: '출석', color: 'bg-green-600' },
  { value: 'late', label: '지각', color: 'bg-yellow-600' },
  { value: 'absent', label: '결석', color: 'bg-red-600' },
  { value: 'excused', label: '사유', color: 'bg-gray-600' },
]

export default function AttendanceManager({ courseId, courseTitle }) {
  const [activeTab, setActiveTab] = useState('take') // 'take' | 'history' | 'stats'
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({}) // { studentId: status }
  const [notes, setNotes] = useState({}) // { studentId: note }
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [weekNumber, setWeekNumber] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)

  useEffect(() => {
    loadStudents()
  }, [courseId])

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats()
    } else if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab, courseId])

  useEffect(() => {
    if (sessionDate && students.length > 0) {
      loadSessionAttendance()
    }
  }, [sessionDate, students])

  const loadStudents = async () => {
    setIsLoading(true)
    try {
      const result = await attendanceService.getCourseStudents(courseId)
      setStudents(result.students || [])
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('학생 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSessionAttendance = async () => {
    try {
      const result = await attendanceService.getSessionAttendance(courseId, sessionDate)
      const attendanceMap = {}
      const notesMap = {}
      result.students?.forEach((s) => {
        if (s.attendance) {
          attendanceMap[s.student.id] = s.attendance.status
          notesMap[s.student.id] = s.attendance.notes || ''
        }
      })
      setAttendance(attendanceMap)
      setNotes(notesMap)
    } catch (error) {
      // If no attendance exists for this date, that's okay
      setAttendance({})
      setNotes({})
    }
  }

  const loadStats = async () => {
    try {
      const result = await attendanceService.getCourseStats(courseId)
      setStats(result.stats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadHistory = async () => {
    try {
      const result = await attendanceService.getCourseAttendance(courseId)
      setHistory(result.attendance || [])
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const handleStatusChange = (studentId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }))
  }

  const handleNoteChange = (studentId, note) => {
    setNotes((prev) => ({
      ...prev,
      [studentId]: note,
    }))
  }

  const handleSetAllStatus = (status) => {
    const newAttendance = {}
    students.forEach((s) => {
      newAttendance[s.id] = status
    })
    setAttendance(newAttendance)
  }

  const handleSave = async () => {
    if (Object.keys(attendance).length === 0) {
      toast.error('출석 상태를 선택해주세요.')
      return
    }

    setIsSaving(true)
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status,
        notes: notes[studentId] || null,
      }))

      await attendanceService.bulkAttendance({
        courseId,
        sessionDate,
        weekNumber,
        records,
      })

      toast.success('출석이 저장되었습니다.')
    } catch (error) {
      console.error('Save attendance error:', error)
      toast.error('출석 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status) => {
    const option = STATUS_OPTIONS.find((o) => o.value === status)
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${option?.color || 'bg-gray-600'}`}>
        {option?.label || status}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">출석 관리</h3>
        {courseTitle && <span className="text-gray-400">{courseTitle}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {[
          { id: 'take', label: '출석 체크' },
          { id: 'history', label: '출석 기록' },
          { id: 'stats', label: '통계' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Take Attendance Tab */}
      {activeTab === 'take' && (
        <div className="space-y-4">
          {/* Date and Week Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">날짜</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">주차</label>
              <select
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                  <option key={w} value={w}>
                    {w}주차
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSetAllStatus(option.value)}
                    className={`px-3 py-2 ${option.color} hover:opacity-80 text-white text-sm rounded-lg transition-opacity`}
                  >
                    전체 {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Students List */}
          {students.length === 0 ? (
            <div className="text-center py-8 text-gray-400">등록된 학생이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      {student.avatar_url ? (
                        <img
                          src={student.avatar_url}
                          alt={student.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-medium">
                          {student.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{student.name}</p>
                      <p className="text-sm text-gray-400">{student.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Status Buttons */}
                    <div className="flex gap-1">
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleStatusChange(student.id, option.value)}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                            attendance[student.id] === option.value
                              ? `${option.color} text-white ring-2 ring-white/30`
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {/* Note Input */}
                    <input
                      type="text"
                      value={notes[student.id] || ''}
                      onChange={(e) => handleNoteChange(student.id, e.target.value)}
                      placeholder="비고"
                      className="w-32 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save Button */}
          {students.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                {isSaving ? '저장 중...' : '출석 저장'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">출석 기록이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-3 pr-4">날짜</th>
                    <th className="pb-3 pr-4">주차</th>
                    <th className="pb-3 pr-4">학생</th>
                    <th className="pb-3 pr-4">상태</th>
                    <th className="pb-3">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id} className="border-b border-gray-700/50">
                      <td className="py-3 pr-4 text-gray-300">{formatDate(record.session_date)}</td>
                      <td className="py-3 pr-4 text-gray-300">{record.week_number}주차</td>
                      <td className="py-3 pr-4 text-white">{record.student?.name}</td>
                      <td className="py-3 pr-4">{getStatusBadge(record.status)}</td>
                      <td className="py-3 text-gray-400">{record.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
              <p className="text-sm text-gray-400">총 수업</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{stats.present}</p>
              <p className="text-sm text-gray-400">출석</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">{stats.late}</p>
              <p className="text-sm text-gray-400">지각</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-red-400">{stats.absent}</p>
              <p className="text-sm text-gray-400">결석</p>
            </div>
          </div>

          {/* Overall Rate */}
          <div className="bg-gray-700/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">전체 출석률</span>
              <span className="text-2xl font-bold text-blue-400">{stats.attendanceRate}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${stats.attendanceRate}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">
              {stats.studentCount}명의 학생, 총 {stats.totalRecords}건의 출석 기록
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
