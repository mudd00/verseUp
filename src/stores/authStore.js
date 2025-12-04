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
        // signOut with scope 'global' to clear session across all tabs
        await supabase.auth.signOut({ scope: 'global' })
      } catch (error) {
        // Ignore signOut errors (e.g., 403 when user is already deleted)
        // Session will still be cleared locally
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
