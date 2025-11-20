import { create } from 'zustand'
import { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => void
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

  logout: () => {
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
