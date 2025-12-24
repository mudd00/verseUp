import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { progressService } from '@/services/progressService'

const TOTAL_WEEKS = 10

export default function ProgressManager({ courseId, courseTitle }) {
  const [progress, setProgress] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState({})

  useEffect(() => {
    loadProgress()
  }, [courseId])

  const loadProgress = async () => {
    setIsLoading(true)
    try {
      const result = await progressService.getCourseProgress(courseId)
      setProgress(result.progress || [])
    } catch (error) {
      console.error('Error loading progress:', error)
      toast.error('진도율을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleWeek = async (progressId, weekNumber, isCompleted) => {
    setIsUpdating((prev) => ({ ...prev, [`${progressId}-${weekNumber}`]: true }))
    try {
      if (isCompleted) {
        await progressService.uncompleteWeek(progressId, weekNumber)
      } else {
        await progressService.completeWeek(progressId, weekNumber)
      }
      await loadProgress()
      toast.success(`${weekNumber}주차 ${isCompleted ? '완료 취소' : '완료 처리'}되었습니다.`)
    } catch (error) {
      console.error('Error toggling week:', error)
      toast.error('주차 상태 변경에 실패했습니다.')
    } finally {
      setIsUpdating((prev) => ({ ...prev, [`${progressId}-${weekNumber}`]: false }))
    }
  }

  const handleBulkComplete = async (weekNumber) => {
    if (!confirm(`모든 학생의 ${weekNumber}주차를 완료 처리하시겠습니까?`)) return

    setIsUpdating((prev) => ({ ...prev, [`bulk-${weekNumber}`]: true }))
    try {
      await progressService.bulkCompleteWeek(courseId, weekNumber)
      await loadProgress()
      toast.success(`전체 학생의 ${weekNumber}주차가 완료 처리되었습니다.`)
    } catch (error) {
      console.error('Error bulk completing:', error)
      toast.error('일괄 완료 처리에 실패했습니다.')
    } finally {
      setIsUpdating((prev) => ({ ...prev, [`bulk-${weekNumber}`]: false }))
    }
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

  // Calculate class average
  const classAverage =
    progress.length > 0
      ? Math.round(
          progress.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / progress.length
        )
      : 0

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">진도율 관리</h3>
        {courseTitle && <span className="text-gray-400">{courseTitle}</span>}
      </div>

      {/* Class Average */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">반 평균 진도율</span>
          <span className="text-2xl font-bold text-purple-400">{classAverage}%</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-3">
          <div
            className="bg-purple-500 h-3 rounded-full transition-all"
            style={{ width: `${classAverage}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-400">{progress.length}명의 학생</p>
      </div>

      {/* Bulk Complete Buttons */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">주차별 전체 완료</h4>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((week) => (
            <button
              key={week}
              onClick={() => handleBulkComplete(week)}
              disabled={isUpdating[`bulk-${week}`]}
              className="px-3 py-1.5 bg-gray-600 hover:bg-purple-600 disabled:bg-gray-500 text-white text-sm rounded transition-colors"
            >
              {isUpdating[`bulk-${week}`] ? '...' : `${week}주차`}
            </button>
          ))}
        </div>
      </div>

      {/* Student Progress List */}
      {progress.length === 0 ? (
        <div className="text-center py-8 text-gray-400">등록된 학생이 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {progress.map((p) => {
            const completedWeeks = p.completed_weeks || []
            return (
              <div key={p.id} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                      {p.student?.avatar_url ? (
                        <img
                          src={p.student.avatar_url}
                          alt={p.student.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-medium">
                          {p.student?.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{p.student?.name}</p>
                      <p className="text-sm text-gray-400">{p.student?.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-400">
                      {Math.round(p.completion_percentage || 0)}%
                    </p>
                    <p className="text-xs text-gray-400">
                      {completedWeeks.length}/{TOTAL_WEEKS}주차 완료
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${p.completion_percentage || 0}%` }}
                  />
                </div>

                {/* Week Checkboxes */}
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((week) => {
                    const isCompleted = completedWeeks.includes(week)
                    const isLoading = isUpdating[`${p.id}-${week}`]
                    return (
                      <button
                        key={week}
                        onClick={() => handleToggleWeek(p.id, week, isCompleted)}
                        disabled={isLoading}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                          isCompleted
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-600 text-gray-400 hover:bg-gray-500'
                        } ${isLoading ? 'opacity-50' : ''}`}
                        title={`${week}주차 ${isCompleted ? '완료됨' : '미완료'}`}
                      >
                        {isLoading ? '...' : week}
                      </button>
                    )
                  })}
                </div>

                {/* Last Activity */}
                {p.last_activity_at && (
                  <p className="mt-2 text-xs text-gray-500">
                    마지막 활동:{' '}
                    {new Date(p.last_activity_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
