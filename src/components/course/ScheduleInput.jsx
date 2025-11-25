
  schedules: CourseSchedule[]
  onChange: (schedules: CourseSchedule[]) => void
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export default function ScheduleInput({ schedules, onChange }: ScheduleInputProps) {
  const addSchedule = () => {
    onChange([
      ...schedules,
      { dayOfWeek: 1, startTime: '09:00', endTime: '11:00' },
    ])
  }

  const removeSchedule = (index) => {
    onChange(schedules.filter((_, i) => i !== index))
  }

  const updateSchedule = (
    index,
    field: keyof CourseSchedule,
    value | number
  ) => {
    const updated = schedules.map((schedule, i) => {
      if (i === index) {
        return { ...schedule, [field]: value }
      }
      return schedule
    })
    onChange(updated)
  }

  return (
    
      
        강의 시간표
        <button
          type="button"
          onClick={addSchedule}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition"
        >
          + 시간 추가
        
      

      {schedules.length === 0 ? (
        
          강의 시간이 설정되지 않았습니다. 시간 추가 버튼을 눌러 추가하세요.
        
      ) : (
        
          {schedules.map((schedule, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-3 p-3 bg-gray-700 rounded-lg"
            >
              
                요일:
                <select
                  value={schedule.dayOfWeek}
                  onChange={(e) =>
                    updateSchedule(index, 'dayOfWeek', Number(e.target.value))
                  }
                  className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500"
                >
                  {DAY_NAMES.map((name, dayIndex) => (
                    
                      {name}요일
                    
                  ))}
                
              

              
                시작:
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) =>
                    updateSchedule(index, 'startTime', e.target.value)
                  }
                  className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500"
                />
              

              
                종료:
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) =>
                    updateSchedule(index, 'endTime', e.target.value)
                  }
                  className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500"
                />
              

              <button
                type="button"
                onClick={() => removeSchedule(index)}
                className="ml-auto px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition"
              >
                삭제
              
            
          ))}
        
      )}

      {schedules.length > 0 && (
        
          설정된 시간표:
          
            {schedules.map((schedule, index) => (
              
                매주 {DAY_NAMES[schedule.dayOfWeek]}요일 {schedule.startTime} ~{' '}
                {schedule.endTime}
              
            ))}
          
        
      )}
    
  )
}

// 시간표를 문자열로 포맷팅하는 헬퍼 함수
export function formatSchedule(schedules: CourseSchedule[] | undefined) {
  if (!schedules || schedules.length === 0) {
    return '미정'
  }

  return schedules
    .map(
      (s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}~${s.endTime}`
    )
    .join(', ')
}
