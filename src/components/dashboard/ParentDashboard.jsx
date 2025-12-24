import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { parentService } from '@/services/parentService'
import CCTVViewer from '@/components/parent/CCTVViewer'
import ChildLocationCard from '@/components/parent/ChildLocationCard'

export default function ParentDashboard() {
  const [children, setChildren] = useState([])
  const [selectedChildId, setSelectedChildId] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [activeTab, setActiveTab] = useState('courses')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)

  // Tab-specific data
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [attendance, setAttendance] = useState(null)
  const [progress, setProgress] = useState([])
  const [childLocation, setChildLocation] = useState(null)

  useEffect(() => {
    loadChildren()
  }, [])

  useEffect(() => {
    if (selectedChildId) {
      loadDashboard(selectedChildId)
      loadTabData(selectedChildId, activeTab)
    }
  }, [selectedChildId])

  useEffect(() => {
    if (selectedChildId) {
      loadTabData(selectedChildId, activeTab)
    }
  }, [activeTab])

  const loadChildren = async () => {
    setIsLoading(true)
    try {
      const result = await parentService.getChildren()
      setChildren(result.children || [])
      if (result.children?.length > 0) {
        setSelectedChildId(result.children[0].id)
      }
    } catch (error) {
      console.error('Error loading children:', error)
      toast.error('자녀 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadDashboard = async (studentId) => {
    setIsLoadingDashboard(true)
    try {
      const result = await parentService.getDashboard(studentId)
      setDashboardData(result)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setIsLoadingDashboard(false)
    }
  }

  const loadTabData = async (studentId, tab) => {
    try {
      switch (tab) {
        case 'courses':
          const coursesRes = await parentService.getCourses(studentId)
          setCourses(coursesRes.courses || [])
          break
        case 'assignments':
          const assignmentsRes = await parentService.getAssignments(studentId)
          setAssignments(assignmentsRes.assignments || [])
          break
        case 'attendance':
          const attendanceRes = await parentService.getAttendance(studentId)
          setAttendance(attendanceRes)
          break
        case 'progress':
          const progressRes = await parentService.getProgress(studentId)
          setProgress(progressRes.progress || [])
          break
      }
    } catch (error) {
      console.error(`Error loading ${tab} data:`, error)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-900/50 text-yellow-400',
      submitted: 'bg-blue-900/50 text-blue-400',
      graded: 'bg-green-900/50 text-green-400',
      overdue: 'bg-red-900/50 text-red-400',
      present: 'bg-green-900/50 text-green-400',
      late: 'bg-yellow-900/50 text-yellow-400',
      absent: 'bg-red-900/50 text-red-400',
      excused: 'bg-gray-700 text-gray-300',
    }

    const labels = {
      pending: '미제출',
      submitted: '제출됨',
      graded: '채점완료',
      overdue: '기한초과',
      present: '출석',
      late: '지각',
      absent: '결석',
      excused: '사유',
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-700 text-gray-300'}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">👨‍👩‍👧</div>
        <h2 className="text-2xl font-bold text-white mb-2">연결된 자녀가 없습니다</h2>
        <p className="text-gray-400 mb-6">
          자녀에게 초대 코드를 요청하여 연결해주세요.
        </p>
      </div>
    )
  }

  const selectedChild = children.find((c) => c.id === selectedChildId)

  return (
    <div className="space-y-6">
      {/* Child Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={selectedChildId || ''}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.nickname || child.name}
                {child.stats && ` (강의 ${child.stats.activeCourses}개)`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      {dashboardData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">수강 강의</p>
            <p className="text-2xl font-bold text-white">
              {dashboardData.stats.activeCourses}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">출석률</p>
            <p className="text-2xl font-bold text-green-400">
              {dashboardData.stats.attendanceRate ?? '-'}%
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">미제출 과제</p>
            <p className="text-2xl font-bold text-yellow-400">
              {dashboardData.stats.pendingAssignments}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">평균 점수</p>
            <p className="text-2xl font-bold text-purple-400">
              {dashboardData.stats.averageGrade ?? '-'}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex gap-4">
          {[
            { id: 'live', label: '실시간 참관' },
            { id: 'courses', label: '강의' },
            { id: 'assignments', label: '과제' },
            { id: 'attendance', label: '출석' },
            { id: 'progress', label: '진도율' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Live Monitoring Tab */}
        {activeTab === 'live' && selectedChild && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Child Location */}
            <ChildLocationCard
              studentId={selectedChild.id}
              studentName={selectedChild.nickname || selectedChild.name}
            />

            {/* CCTV Viewer */}
            <CCTVViewer
              classroomId={childLocation?.classroomId}
              studentId={selectedChild.id}
              studentName={selectedChild.nickname || selectedChild.name}
            />
          </div>
        )}

        {activeTab === 'live' && !selectedChild && (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p className="text-gray-400">자녀를 선택해주세요.</p>
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            {courses.length === 0 ? (
              <p className="text-gray-400 text-center py-8">수강 중인 강의가 없습니다.</p>
            ) : (
              courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4"
                >
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{course.title}</h4>
                    <p className="text-sm text-gray-400">
                      강사: {course.instructor?.name} | 진도: {course.progress}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">출석률</p>
                    <p className="text-lg font-medium text-green-400">
                      {course.attendanceRate ?? '-'}%
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <p className="text-gray-400 text-center py-8">과제가 없습니다.</p>
            ) : (
              assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">{assignment.title}</h4>
                      {getStatusBadge(assignment.submission?.status)}
                    </div>
                    <p className="text-sm text-gray-400">
                      {assignment.course?.title} | 마감: {formatDate(assignment.dueDate)}
                    </p>
                  </div>
                  {assignment.submission?.score !== null && (
                    <div className="text-right">
                      <p className="text-lg font-medium text-purple-400">
                        {assignment.submission.score} / {assignment.maxScore}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && attendance && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{attendance.stats.totalSessions}</p>
                <p className="text-xs text-gray-400">전체</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{attendance.stats.presentCount}</p>
                <p className="text-xs text-gray-400">출석</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{attendance.stats.lateCount}</p>
                <p className="text-xs text-gray-400">지각</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{attendance.stats.absentCount}</p>
                <p className="text-xs text-gray-400">결석</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{attendance.stats.attendanceRate ?? 0}%</p>
                <p className="text-xs text-gray-400">출석률</p>
              </div>
            </div>

            {/* Records */}
            <div className="space-y-2">
              {attendance.attendance?.length === 0 ? (
                <p className="text-gray-400 text-center py-8">출석 기록이 없습니다.</p>
              ) : (
                attendance.attendance?.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3"
                  >
                    <div>
                      <p className="text-white">{record.course?.title}</p>
                      <p className="text-sm text-gray-400">
                        {formatDate(record.sessionDate)} | {record.weekNumber}주차
                      </p>
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            {progress.length === 0 ? (
              <p className="text-gray-400 text-center py-8">진도 정보가 없습니다.</p>
            ) : (
              progress.map((p) => (
                <div key={p.courseId} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{p.courseTitle}</h4>
                    <span className="text-sm text-gray-400">
                      {p.currentWeek} / {p.totalWeeks}주차
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${p.completionPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>진도율: {p.completionPercentage}%</span>
                    <span>
                      마지막 활동: {p.lastActivityAt ? formatDate(p.lastActivityAt) : '-'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {dashboardData?.recentActivity?.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">최근 활동</h3>
          <div className="space-y-3">
            {dashboardData.recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
              >
                <div>
                  <p className="text-white">{activity.title}</p>
                  <p className="text-sm text-gray-400">{activity.courseName}</p>
                </div>
                <div className="text-right">
                  {activity.score !== null && (
                    <p className="text-purple-400 font-medium">{activity.score}점</p>
                  )}
                  <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
