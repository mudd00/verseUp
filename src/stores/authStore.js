import { create } from 'zustand'

export const useAuthStore = create((set) => ({
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
