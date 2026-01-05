'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

/**
 * Profile data from the profiles table.
 */
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_expert: boolean
  created_at: string
}

/**
 * Expert profile data from the experts table.
 */
export interface ExpertProfile {
  id: string
  bio: string | null
  expertise_tags: string[]
  hourly_rate: number
  available: boolean
  rating: number
  total_sessions: number
  stripe_account_id: string | null
  approved: boolean
  created_at: string
}

/**
 * Auth state returned by useAuth hook.
 */
export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  expertProfile: ExpertProfile | null
  loading: boolean
  isAuthenticated: boolean
  isExpert: boolean
}

/**
 * Auth actions returned by useAuth hook.
 */
export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error?: string }>
  signInWithGoogle: (redirectTo?: string) => Promise<{ error?: string }>
  signOut: () => Promise<{ error?: string }>
  refreshProfile: () => Promise<void>
  refreshExpertProfile: () => Promise<void>
}

/**
 * Custom hook for managing authentication state.
 * Provides real-time auth state updates and auth actions.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signOut, loading } = useAuth()
 *
 *   if (loading) return <Spinner />
 *
 *   if (!isAuthenticated) {
 *     return <LoginPrompt />
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.email}</p>
 *       <button onClick={signOut}>Sign out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuth(): AuthState & AuthActions {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Fetch the user's profile from the profiles table.
   */
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        return null
      }

      return data as Profile
    },
    [supabase]
  )

  /**
   * Fetch the user's expert profile if they are an approved expert.
   */
  const fetchExpertProfile = useCallback(
    async (userId: string): Promise<ExpertProfile | null> => {
      const { data, error } = await supabase
        .from('experts')
        .select('*')
        .eq('id', userId)
        .eq('approved', true)
        .single()

      if (error) {
        return null
      }

      return data as ExpertProfile
    },
    [supabase]
  )

  /**
   * Refresh the user's profile data.
   */
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }

    const profileData = await fetchProfile(user.id)
    setProfile(profileData)
  }, [user, fetchProfile])

  /**
   * Refresh the user's expert profile data.
   */
  const refreshExpertProfile = useCallback(async () => {
    if (!user) {
      setExpertProfile(null)
      return
    }

    const expertData = await fetchExpertProfile(user.id)
    setExpertProfile(expertData)
  }, [user, fetchExpertProfile])

  /**
   * Initialize auth state and set up listeners.
   */
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        if (initialSession?.user) {
          const [profileData, expertData] = await Promise.all([
            fetchProfile(initialSession.user.id),
            fetchExpertProfile(initialSession.user.id),
          ])
          setProfile(profileData)
          setExpertProfile(expertData)
        }
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          const [profileData, expertData] = await Promise.all([
            fetchProfile(currentSession.user.id),
            fetchExpertProfile(currentSession.user.id),
          ])
          setProfile(profileData)
          setExpertProfile(expertData)
        } else {
          setProfile(null)
          setExpertProfile(null)
        }

        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          // Clear any local state and redirect
          router.refresh()
        } else if (event === 'SIGNED_IN') {
          router.refresh()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, fetchProfile, fetchExpertProfile])

  /**
   * Sign in with email and password.
   */
  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    },
    [supabase]
  )

  /**
   * Sign up with email and password.
   */
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string
    ): Promise<{ error?: string }> => {
      if (password.length < 6) {
        return { error: 'Password must be at least 6 characters long' }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    },
    [supabase]
  )

  /**
   * Sign in with Google OAuth.
   */
  const signInWithGoogle = useCallback(
    async (redirectTo: string = '/dashboard'): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    },
    [supabase]
  )

  /**
   * Sign out the current user.
   */
  const signOut = useCallback(async (): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }

    return {}
  }, [supabase])

  return {
    // State
    user,
    session,
    profile,
    expertProfile,
    loading,
    isAuthenticated: !!user,
    isExpert: !!expertProfile,
    // Actions
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
    refreshExpertProfile,
  }
}

/**
 * Hook to require authentication.
 * Redirects to login page if user is not authenticated.
 *
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { user, loading } = useRequireAuth()
 *
 *   if (loading) return <Spinner />
 *
 *   return <div>Welcome, {user?.email}</div>
 * }
 * ```
 */
export function useRequireAuth(redirectTo: string = '/dashboard') {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
    }
  }, [auth.loading, auth.isAuthenticated, redirectTo, router])

  return auth
}

/**
 * Hook to require expert role.
 * Redirects to become-expert page if user is not an approved expert.
 *
 * @example
 * ```tsx
 * function ExpertDashboard() {
 *   const { expertProfile, loading } = useRequireExpert()
 *
 *   if (loading) return <Spinner />
 *
 *   return <div>Your rating: {expertProfile?.rating}</div>
 * }
 * ```
 */
export function useRequireExpert() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!auth.loading) {
      if (!auth.isAuthenticated) {
        router.push('/login?redirectTo=/expert/dashboard')
      } else if (!auth.isExpert) {
        router.push('/become-expert')
      }
    }
  }, [auth.loading, auth.isAuthenticated, auth.isExpert, router])

  return auth
}
