import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { enrollmentService } from '@/services/enrollmentService'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

// 오늘의 요일 인덱스 (0=일요일)
const TODAY_DAY_INDEX = new Date().getDay()

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const [enrollments, setEnrollments] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadEnrollments()
  }, [])

  const loadEnrollments = async () => {
    try {
      setIsLoading(true)
      const data = await enrollmentService.getMyEnrollments()
      setEnrollments(data)
    } catch (err) {
      console.error('수강 목록 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 전체 시간표 생성 (요일별로 그룹화)
  const getWeeklySchedule = () => {
    const scheduleByDay: { [key]: { course; schedule: CourseSchedule }[] } = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    }

    enrollments.forEach((enrollment) => {
      if (enrollment.course?.schedule) {
        enrollment.course.schedule.forEach((schedule) => {
          scheduleByDay[schedule.dayOfWeek].push({
            course: enrollment.course!.title,
            schedule,
          })
        })
      }
    })

    // 각 요일 내에서 시간순 정렬
    Object.keys(scheduleByDay).forEach((day) => {
      scheduleByDay[Number(day)].sort((a, b) =>
        a.schedule.startTime.localeCompare(b.schedule.startTime)
      )
    })

    return scheduleByDay
  }

  // 오늘의 강의 목록
  const getTodaySchedule = () => {
    return getWeeklySchedule()[TODAY_DAY_INDEX]
  }

  const weeklySchedule = getWeeklySchedule()
  const todaySchedule = getTodaySchedule()

  return (
    
      대시보드

      
        환영합니다, {user?.name}님!
        역할: 학생
      

      
        
          수강 중인 강의
          {enrollments.length}
          현재 수강 중
        
        
          오늘 강의
          {todaySchedule.length}
          {DAY_NAMES[TODAY_DAY_INDEX]}요일
        
        
          과제
          0
          제출 대기 중
        
      

      {/* 오늘의 강의 */}
      
        
          오늘의 강의 ({DAY_NAMES[TODAY_DAY_INDEX]}요일)
        
        {isLoading ? (
          로딩 중...
        ) : todaySchedule.length === 0 ? (
          오늘은 예정된 강의가 없습니다.
        ) : (
          
            {todaySchedule.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                
                  {item.course}
                  
                    {item.schedule.startTime} ~ {item.schedule.endTime}
                  
                
              
            ))}
          
        )}
      

      {/* 수강 중인 강의 목록 */}
      
        
          수강 중인 강의
          <Link
            to="/courses"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            강의 더 찾아보기 →
          
        
        {isLoading ? (
          로딩 중...
        ) : enrollments.length === 0 ? (
          
            수강 중인 강의가 없습니다.
            <Link
              to="/courses"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition inline-block"
            >
              강의 둘러보기
            
          
        ) : (
          
            {enrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                to={`/courses/${enrollment.courseId}`}
                className="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
              >
                {enrollment.course?.title}
                
                  {enrollment.course?.instructor?.name || '강사 정보 없음'}
                
                {enrollment.course?.schedule && enrollment.course.schedule.length > 0 && (
                  
                    {enrollment.course.schedule
                      .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}`)
                      .join(', ')}
                  
                )}
              
            ))}
          
        )}
      

      {/* 주간 시간표 */}
      
        주간 시간표
        {isLoading ? (
          로딩 중...
        ) : enrollments.length === 0 ? (
          수강 중인 강의가 없어 시간표가 비어있습니다.
        ) : (
          
            {DAY_NAMES.map((day, dayIndex) => (
              
                <div
                  className={`text-center p-2 rounded-t font-medium ${
                    dayIndex === TODAY_DAY_INDEX
                      ? 'bg-blue-600'
                      : 'bg-gray-700'
                  }`}
                >
                  {day}
                
                
                  {weeklySchedule[dayIndex].length === 0 ? (
                    -
                  ) : (
                    weeklySchedule[dayIndex].map((item, index) => (
                      <div
                        key={index}
                        className="text-xs p-1 bg-blue-600/30 rounded"
                        title={item.course}
                      >
                        {item.course}
                        
                          {item.schedule.startTime}
                        
                      
                    ))
                  )}
                
              
            ))}
          
        )}
      
    
  )
}
