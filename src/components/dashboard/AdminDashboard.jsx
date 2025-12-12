import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Users,
  BookOpen,
  CreditCard,
  DoorOpen,
  BarChart3,
  Settings,
  Home,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore.js'

const menuItems = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: Home,
    path: '/dashboard',
  },
  {
    id: 'users',
    label: '사용자 관리',
    icon: Users,
    path: '/admin/users',
  },
  {
    id: 'courses',
    label: '강의 관리',
    icon: BookOpen,
    path: '/admin/courses',
  },
  {
    id: 'enrollments',
    label: '수강 관리',
    icon: BarChart3,
    path: '/admin/enrollments',
  },
  {
    id: 'payments',
    label: '결제/환불 관리',
    icon: CreditCard,
    path: '/admin/payments',
  },
  {
    id: 'classrooms',
    label: '강의실 관리',
    icon: DoorOpen,
    path: '/admin/classrooms',
  },
  {
    id: 'settings',
    label: '설정',
    icon: Settings,
    path: '/admin/settings',
  },
]

export default function AdminDashboard({ children }) {
  const location = useLocation()
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalRevenue: 0,
    todaySignups: 0,
    todayEnrollments: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      // TODO: API 호출로 실제 통계 데이터 가져오기
      const response = await fetch('/api/admin/stats/overview', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('통계 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 현재 경로가 /dashboard이고 children이 없으면 기본 대시보드 표시
  const showDefaultDashboard =
    location.pathname === '/dashboard' && !children

  return (
    <div className="flex gap-6">
      {/* 사이드바 */}
      <aside className="w-64 bg-gray-800 rounded-lg p-4 h-fit sticky top-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">관리자 페이지</h2>
          <p className="text-sm text-gray-400">{user?.name}님</p>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="flex-1">
        {showDefaultDashboard ? (
          <div>
            <h1 className="text-4xl font-bold mb-8">관리자 대시보드</h1>

            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">총 사용자</h3>
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold">
                  {isLoading ? '...' : stats.totalUsers}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  오늘 +{stats.todaySignups}명
                </p>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">총 강의</h3>
                  <BookOpen className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold">
                  {isLoading ? '...' : stats.totalCourses}
                </p>
                <p className="text-xs text-gray-500 mt-1">활성 강의</p>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">총 매출</h3>
                  <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold">
                  {isLoading
                    ? '...'
                    : `₩${(stats.totalRevenue / 10000).toFixed(0)}만`}
                </p>
                <p className="text-xs text-gray-500 mt-1">누적 매출</p>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-400">
                    오늘의 수강 신청
                  </h3>
                  <BarChart3 className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-3xl font-bold">
                  {isLoading ? '...' : stats.todayEnrollments}
                </p>
                <p className="text-xs text-gray-500 mt-1">건</p>
              </div>
            </div>

            {/* 활동 로그 */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
              <h3 className="text-xl font-semibold mb-4">최근 활동</h3>
              <p className="text-gray-400">활동 로그는 추후 구현 예정입니다.</p>
            </div>

            {/* 인기 강의 */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">인기 강의 TOP 5</h3>
              <p className="text-gray-400">인기 강의 목록은 추후 구현 예정입니다.</p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
