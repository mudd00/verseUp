/**
 * 시간표를 문자열로 포맷팅하는 헬퍼 함수
 * @param {Array} schedules - 시간표 배열
 * @returns {string} 포맷된 시간표 문자열
 */
export function formatSchedule(schedules) {
  if (!schedules || schedules.length === 0) {
    return '미정'
  }

  const DAY_NAMES = {
    mon: '월',
    tue: '화',
    wed: '수',
    thu: '목',
    fri: '금',
    sat: '토',
    sun: '일',
  }

  return schedules
    .map((s) => {
      const dayStr = DAY_NAMES[s.dayOfWeek] || s.dayOfWeek || s.day
      return `${dayStr} ${s.startTime}~${s.endTime}`
    })
    .join(', ')
}
