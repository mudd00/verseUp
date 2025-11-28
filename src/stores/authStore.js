import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, token) => {
    localStorage.setItem('accessToken', token)
    set({ user, isAuthenticated: true, isLoading: false })
  },

  logout: async (skipSupabaseSignOut = false) => {
    if (!skipSupabaseSignOut) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        // Ignore signOut errors (e.g., when user is already deleted)
        console.log('SignOut error (ignored):', error.message)
      }
    }
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
