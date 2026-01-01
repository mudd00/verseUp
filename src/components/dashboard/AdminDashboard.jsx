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
  TrendingUp,
  Clock,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useAuthStore } from '@/stores/authStore.js'
import { format } from 'date-fns'

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
  const [revenueData, setRevenueData] = useState([])
  const [popularCourses, setPopularCourses] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [revenuePeriod, setRevenuePeriod] = useState('daily') // daily, weekly, monthly

  useEffect(() => {
    loadStats()
    loadRevenueData()
    loadPopularCourses()
    loadRecentActivities()
  }, [])

  useEffect(() => {
    loadRevenueData()
  }, [revenuePeriod])

  const loadStats = async () => {
    try {
      setIsLoading(true)
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

  const loadRevenueData = async () => {
    try {
      const response = await fetch(
        `/api/admin/stats/revenue?period=${revenuePeriod}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setRevenueData(data.revenue || [])
      }
    } catch (error) {
      console.error('매출 데이터 로드 실패:', error)
    }
  }

  const loadPopularCourses = async () => {
    try {
      const response = await fetch('/api/admin/stats/popular-courses', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPopularCourses(data.courses || [])
      }
    } catch (error) {
      console.error('인기 강의 로드 실패:', error)
    }
  }

  const loadRecentActivities = async () => {
    try {
      const response = await fetch('/api/admin/stats/activities', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRecentActivities(data.activities || [])
      }
    } catch (error) {
      console.error('활동 로그 로드 실패:', error)
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
                    : stats.totalRevenue >= 10000
                      ? `₩${(stats.totalRevenue / 10000).toFixed(0)}만원`
                      : `₩${stats.totalRevenue?.toLocaleString() || 0}원`}
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

            {/* 매출 추이 그래프 */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <h3 className="text-xl font-semibold">매출 추이</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRevenuePeriod('daily')}
                    className={`px-3 py-1 rounded text-sm transition ${
                      revenuePeriod === 'daily'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    일별
                  </button>
                  <button
                    onClick={() => setRevenuePeriod('weekly')}
                    className={`px-3 py-1 rounded text-sm transition ${
                      revenuePeriod === 'weekly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    주별
                  </button>
                  <button
                    onClick={() => setRevenuePeriod('monthly')}
                    className={`px-3 py-1 rounded text-sm transition ${
                      revenuePeriod === 'monthly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    월별
                  </button>
                </div>
              </div>

              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#F3F4F6' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="매출"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-12">
                  매출 데이터가 없습니다.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* 인기 강의 TOP 10 */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">인기 강의 TOP 10</h3>

                {popularCourses.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={popularCourses.slice(0, 10)}
                      layout="vertical"
                      margin={{ left: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9CA3AF" />
                      <YAxis
                        dataKey="title"
                        type="category"
                        stroke="#9CA3AF"
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#F3F4F6' }}
                      />
                      <Bar
                        dataKey="enrolled_count"
                        name="수강생 수"
                        fill="#10B981"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-center py-12">
                    인기 강의 데이터가 없습니다.
                  </p>
                )}
              </div>

              {/* 최근 활동 로그 */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-semibold">최근 활동</h3>
                </div>

                {recentActivities.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {recentActivities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition"
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            activity.type === 'signup'
                              ? 'bg-green-400'
                              : activity.type === 'enrollment'
                                ? 'bg-blue-400'
                                : activity.type === 'payment'
                                  ? 'bg-purple-400'
                                  : 'bg-gray-400'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {activity.created_at
                              ? format(
                                  new Date(activity.created_at),
                                  'yyyy-MM-dd HH:mm'
                                )
                              : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-12">
                    최근 활동 내역이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
