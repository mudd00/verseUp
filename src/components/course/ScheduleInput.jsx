const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export default function ScheduleInput({ schedules, onChange }) {
  const addSchedule = () => {
    onChange([
      ...schedules,
      { dayOfWeek: 1, startTime: '09:00', endTime: '11:00' },
    ])
  }

  const removeSchedule = (index) => {
    onChange(schedules.filter((_, i) => i !== index))
  }

  const updateSchedule = (index, field, value) => {
    const updated = schedules.map((schedule, i) => {
      if (i === index) {
        return { ...schedule, [field]: value }
      }
      return schedule
    })
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium">강의 시간표</label>
        <button
          type="button"
          onClick={addSchedule}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition"
        >
          + 시간 추가
        </button>
      </div>

      {schedules.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center bg-gray-700 rounded-lg">
          강의 시간이 설정되지 않았습니다. 시간 추가 버튼을 눌러 추가하세요.
        </p>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-3 p-3 bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">요일:</span>
                <select
                  value={schedule.dayOfWeek}
                  onChange={(e) =>
                    updateSchedule(index, 'dayOfWeek', Number(e.target.value))
                  }
                  className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500"
                >
                  {DAY_NAMES.map((name, dayIndex) => (
                    <option key={dayIndex} value={dayIndex}>
                      {name}요일
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">시작:</span>
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) =>
                    updateSchedule(index, 'startTime', e.target.value)
                  }
                  className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">종료:</span>
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) =>
                    updateSchedule(index, 'endTime', e.target.value)
                  }
                  className="px-3 py-1.5 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={() => removeSchedule(index)}
                className="ml-auto px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {schedules.length > 0 && (
        <div className="text-sm text-gray-400 bg-gray-700/50 p-3 rounded-lg">
          <p className="font-medium mb-1">설정된 시간표:</p>
          <ul className="list-disc list-inside">
            {schedules.map((schedule, index) => (
              <li key={index}>
                매주 {DAY_NAMES[schedule.dayOfWeek]}요일 {schedule.startTime} ~{' '}
                {schedule.endTime}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

