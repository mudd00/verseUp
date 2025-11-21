import { create } from 'zustand'
import { User } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, token) => {
    console.log('🔐 [AuthStore] login called:', user.email, user.role)
    localStorage.setItem('accessToken', token)
    set({ user, isAuthenticated: true, isLoading: false })
    console.log('✅ [AuthStore] login complete, isLoading: false, isAuthenticated: true')
  },

  logout: async () => {
    console.log('🚪 [AuthStore] logout called')
    await supabase.auth.signOut()
    localStorage.removeItem('accessToken')
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  setUser: (user) => {
    console.log('👤 [AuthStore] setUser called:', user ? user.email : 'null')
    set({ user, isAuthenticated: !!user, isLoading: false })
    console.log('✅ [AuthStore] setUser complete, isLoading: false')
  },

  setLoading: (loading) => {
    console.log('⏳ [AuthStore] setLoading called:', loading)
    set({ isLoading: loading })
  },
}))
