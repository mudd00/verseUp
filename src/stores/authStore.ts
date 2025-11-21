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
    localStorage.setItem('accessToken', token)
    set({ user, isAuthenticated: true, isLoading: false })
  },

  logout: async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('accessToken')
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user, isLoading: false })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },
}))
