import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Courses from './pages/Courses.jsx'
import CourseDetail from './pages/CourseDetail.jsx'
import CreateCourse from './pages/CreateCourse.jsx'
import EditCourse from './pages/EditCourse.jsx'
import MyCourses from './pages/MyCourses.jsx'
import Profile from './pages/Profile.jsx'
import Metaverse from './pages/Metaverse.jsx'
import WhiteboardController from './pages/WhiteboardController.jsx'
import Payment from './pages/Payment.jsx'
import PaymentSuccess from './pages/PaymentSuccess.jsx'
import PaymentFail from './pages/PaymentFail.jsx'
import PaymentHistory from './pages/PaymentHistory.jsx'
import Forbidden from './pages/Forbidden.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import AdminDashboard from './components/dashboard/AdminDashboard.jsx'
import UserManagement from './components/admin/UserManagement.jsx'
import CourseManagement from './components/admin/CourseManagement.jsx'
import EnrollmentManagement from './components/admin/EnrollmentManagement.jsx'
import PaymentManagement from './components/admin/PaymentManagement.jsx'
import ClassroomManagement from './components/admin/ClassroomManagement.jsx'
import { useAuthStore } from './stores/authStore.js'
import { supabase } from './lib/supabase.js'
import { ROUTES } from './utils/constants.js'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} />
}

function App() {
  const setUser = useAuthStore((state) => state.setUser)
  const setLoading = useAuthStore((state) => state.setLoading)
  const login = useAuthStore((state) => state.login)

  useEffect(() => {
    let ignore = false

    // Check current session
    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (ignore) return

        if (error) {
          console.error('Failed to get session:', error)
          setLoading(false)
          return
        }

        if (session?.user) {
          // email 기반으로 role 추론 (fallback)
          const inferRoleFromEmail = (email) => {
            if (email.includes('instructor@')) return 'instructor'
            if (email.includes('admin@')) return 'admin'
            return 'student'
          }

          // user_metadata만 사용 (profiles 조회 스킵)
          const metadataRole = session.user.user_metadata?.role
          const emailBasedRole = inferRoleFromEmail(session.user.email || '')
          const finalRole = metadataRole || emailBasedRole

          const user = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'User',
            role: finalRole,
            createdAt: session.user.created_at,
            updatedAt: session.user.updated_at || session.user.created_at,
          }
          login(user, session.access_token)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        if (ignore) return
        console.error('Session check failed:', err)
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (ignore) return

      console.log('Auth state change:', event, session?.user?.id)

      // Handle SIGNED_IN event
      if (event === 'SIGNED_IN' && session?.user) {
        // email 기반으로 role 추론 (fallback)
        const inferRoleFromEmail = (email) => {
          if (email.includes('instructor@')) return 'instructor'
          if (email.includes('admin@')) return 'admin'
          return 'student'
        }

        // user_metadata만 사용 (profiles 조회 스킵)
        const metadataRole = session.user.user_metadata?.role
        const emailBasedRole = inferRoleFromEmail(session.user.email || '')
        const finalRole = metadataRole || emailBasedRole

        const user = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'User',
          role: finalRole,
          createdAt: session.user.created_at,
          updatedAt: session.user.updated_at || session.user.created_at,
        }
        login(user, session.access_token)
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || !session) {
        // Handle logout, user deletion, or session expiration
        setUser(null)
        localStorage.removeItem('accessToken')
      }
    })

    return () => {
      ignore = true
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #374151',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route element={<Layout />}>
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route path={ROUTES.COURSES} element={<Courses />} />
            <Route path={ROUTES.COURSE_DETAIL} element={<CourseDetail />} />
            <Route
              path={ROUTES.CREATE_COURSE}
              element={
                <PrivateRoute>
                  <CreateCourse />
                </PrivateRoute>
              }
            />
            <Route
              path="/courses/:id/edit"
              element={
                <PrivateRoute>
                  <EditCourse />
                </PrivateRoute>
              }
            />
            <Route
              path={ROUTES.MY_COURSES}
              element={
                <PrivateRoute>
                  <MyCourses />
                </PrivateRoute>
              }
            />
            <Route
              path={ROUTES.DASHBOARD}
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path={ROUTES.PROFILE}
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            {/* Payment Routes */}
            <Route
              path="/payment"
              element={
                <PrivateRoute>
                  <Payment />
                </PrivateRoute>
              }
            />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/fail" element={<PaymentFail />} />
            <Route
              path="/payment/history"
              element={
                <PrivateRoute>
                  <PaymentHistory />
                </PrivateRoute>
              }
            />
            {/* Forbidden page */}
            <Route path="/forbidden" element={<Forbidden />} />
            {/* Admin Routes */}
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminDashboard>
                    <UserManagement />
                  </AdminDashboard>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <AdminRoute>
                  <AdminDashboard>
                    <CourseManagement />
                  </AdminDashboard>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/enrollments"
              element={
                <AdminRoute>
                  <AdminDashboard>
                    <EnrollmentManagement />
                  </AdminDashboard>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <AdminRoute>
                  <AdminDashboard>
                    <PaymentManagement />
                  </AdminDashboard>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/classrooms"
              element={
                <AdminRoute>
                  <AdminDashboard>
                    <ClassroomManagement />
                  </AdminDashboard>
                </AdminRoute>
              }
            />
          </Route>
          {/* Metaverse - Full screen, no layout */}
          <Route path={ROUTES.METAVERSE} element={<Metaverse />} />
          {/* Whiteboard Controller - Full screen, no layout */}
          <Route path="/whiteboard-controller" element={<WhiteboardController />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App