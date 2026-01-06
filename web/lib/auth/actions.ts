'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side auth actions for authentication operations.
 * These actions can be called from Server Components and Client Components.
 * All functions use the Supabase server client with cookie-based sessions.
 */

export interface AuthError {
  message: string
  code?: string
}

export interface AuthResult {
  success: boolean
  error?: AuthError
  redirectTo?: string
}

/**
 * Sign in with email and password.
 * Use this from form submissions or server-side logic.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    }
  }

  return { success: true }
}

/**
 * Sign up with email and password.
 * Creates a new user account and sends confirmation email.
 * User profile is automatically created via database trigger.
 */
export async function signUp(
  email: string,
  password: string,
  fullName?: string,
  redirectTo: string = '/dashboard'
): Promise<AuthResult> {
  const supabase = await createClient()

  // Validate password length
  if (password.length < 6) {
    return {
      success: false,
      error: {
        message: 'Password must be at least 6 characters long',
        code: 'weak_password',
      },
    }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
    },
  })

  if (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    }
  }

  return { success: true }
}

/**
 * Sign out the current user.
 * Clears the session and redirects to login page.
 */
export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    }
  }

  return { success: true }
}

/**
 * Sign out and redirect to login page.
 * Useful for server-side sign out with automatic redirect.
 */
export async function signOutAndRedirect(): Promise<never> {
  await signOut()
  redirect('/login')
}

/**
 * Get the currently authenticated user.
 * Returns null if no user is logged in.
 * Uses getUser() which validates the session on the server.
 */
export async function getUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Get the current session.
 * Returns null if no session exists.
 * Note: Prefer getUser() for security-critical operations as it validates the JWT.
 */
export async function getSession() {
  const supabase = await createClient()

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    return null
  }

  return session
}

/**
 * Require authentication for a page or action.
 * Redirects to login if no user is authenticated.
 * Returns the user if authenticated.
 */
export async function requireAuth(redirectTo: string = '/dashboard') {
  const user = await getUser()

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
  }

  return user
}

/**
 * Get the user profile from the profiles table.
 * Returns the full profile data including expert status.
 */
export async function getUserProfile() {
  const supabase = await createClient()
  const user = await getUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return null
  }

  return profile
}

/**
 * Check if the current user is an approved expert.
 * Returns the expert data if true, null otherwise.
 */
export async function getExpertProfile() {
  const supabase = await createClient()
  const user = await getUser()

  if (!user) {
    return null
  }

  const { data: expert, error } = await supabase
    .from('experts')
    .select('*')
    .eq('id', user.id)
    .eq('approved', true)
    .single()

  if (error || !expert) {
    return null
  }

  return expert
}

/**
 * Require expert role for a page or action.
 * Redirects to become-expert page if user is not an approved expert.
 */
export async function requireExpert() {
  const expert = await getExpertProfile()

  if (!expert) {
    const user = await getUser()
    if (!user) {
      redirect('/login?redirectTo=/expert/dashboard')
    }
    redirect('/become-expert')
  }

  return expert
}

/**
 * Update the user's profile.
 * Only updates the current user's profile.
 */
export async function updateUserProfile(updates: {
  full_name?: string
  avatar_url?: string
}): Promise<AuthResult> {
  const supabase = await createClient()
  const user = await getUser()

  if (!user) {
    return {
      success: false,
      error: {
        message: 'Not authenticated',
        code: 'not_authenticated',
      },
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    }
  }

  return { success: true }
}

/**
 * Request a password reset email.
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?redirectTo=/reset-password`,
  })

  if (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    }
  }

  return { success: true }
}

/**
 * Update the user's password.
 * Requires the user to be authenticated (e.g., via reset password link).
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = await createClient()

  // Validate password length
  if (newPassword.length < 6) {
    return {
      success: false,
      error: {
        message: 'Password must be at least 6 characters long',
        code: 'weak_password',
      },
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    }
  }

  return { success: true }
}
