import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

export default function InstructorDashboard() {
  const { user } = useAuthStore()

  return (
    
      
        강사 대시보드
        <Link
          to={ROUTES.CREATE_COURSE}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          + 새 강좌 개설
        
      

      
        환영합니다, {user?.name} 강사님!
        역할: 강사
      

      
        
          내 강의
          0
          개설한 강의 수
        
        
          총 수강인원
          0명
          전체 강의 기준
        
        
          진행 중인 강의
          0
          활성 강의
        
      

      
        다가오는 수업
        예정된 수업이 없습니다.
      

      
        
          내 강의 관리
          <Link
            to={ROUTES.MY_COURSES}
            className="text-blue-400 hover:text-blue-300 transition"
          >
            전체 보기 →
          
        
        
          강의 목록 관리, 공개/비공개 설정, 수정 및 삭제는 "내 강의 관리" 페이지에서 할 수 있습니다.
        
        <Link
          to={ROUTES.MY_COURSES}
          className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        >
          내 강의 관리로 이동
        
      

      
        학생 활동
        최근 학생 활동이 없습니다.
      
    
  )
}
