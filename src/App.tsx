import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Courses from './pages/Courses'
import CreateCourse from './pages/CreateCourse'
import EditCourse from './pages/EditCourse'
import Profile from './pages/Profile'
import Metaverse from './pages/Metaverse'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'
import { ROUTES } from './utils/constants'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function PrivateRoute({ children }: { children: React.ReactNode }) {
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
    console.log('🔍 [App] Initializing auth...')
    let ignore = false

    // Check current session
    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (ignore) return
        console.log('📦 [App] Session received:', session ? 'Yes' : 'No', error ? `Error: ${error.message}` : '')

        if (error) {
          console.error('❌ [App] Failed to get session:', error)
          setLoading(false)
          return
        }

        if (session?.user) {
          console.log('👤 [App] User found:', session.user.email)

          // user_metadata만 사용 (profiles 조회 스킵)
          const user = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'User',
            role: (session.user.user_metadata?.role || 'student') as
              | 'student'
              | 'instructor'
              | 'admin',
            createdAt: session.user.created_at,
            updatedAt: session.user.updated_at || session.user.created_at,
          }
          console.log('✅ [App] Calling login with user:', user.email, user.role)
          login(user, session.access_token)
        } else {
          console.log('ℹ️ [App] No session, setting loading to false')
          setLoading(false)
        }
      })
      .catch((err) => {
        if (ignore) return
        console.error('❌ [App] Session check failed:', err)
        setLoading(false)
      })

    // Listen for auth changes (only for SIGN_IN and SIGN_OUT)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (ignore) return
      console.log('🔔 [App] Auth state changed:', event)

      // Only handle SIGNED_IN and SIGNED_OUT events, ignore others
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('👤 [App] User signed in:', session.user.email)

        // user_metadata만 사용 (profiles 조회 스킵)
        const user = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'User',
          role: (session.user.user_metadata?.role || 'student') as 'student' | 'instructor' | 'admin',
          createdAt: session.user.created_at,
          updatedAt: session.user.updated_at || session.user.created_at,
        }
        console.log('✅ [App] Calling login with user:', user.email, user.role)
        login(user, session.access_token)
      } else if (event === 'SIGNED_OUT') {
        console.log('ℹ️ [App] User signed out')
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
        <Routes>
          <Route element={<Layout />}>
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route path={ROUTES.COURSES} element={<Courses />} />
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
          </Route>
          {/* Metaverse - Full screen, no layout */}
          <Route path={ROUTES.METAVERSE} element={<Metaverse />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
