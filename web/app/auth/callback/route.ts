import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Auth callback route for handling OAuth redirects and email confirmations.
 *
 * This route receives the authorization code from OAuth providers (Google)
 * or email confirmation links and exchanges it for a session.
 *
 * After successful authentication, it redirects to the intended page
 * (passed via redirectTo query param) or defaults to /dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  // Get the authorization code from the URL
  const code = searchParams.get('code')

  // Get the redirect destination (default to dashboard)
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  // Handle error from OAuth provider
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    // Redirect to login with error message
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      // Redirect to login with error message
      const loginUrl = new URL('/login', origin)
      loginUrl.searchParams.set('error', exchangeError.message)
      return NextResponse.redirect(loginUrl)
    }

    // Successfully authenticated - redirect to intended destination
    const destinationUrl = new URL(redirectTo, origin)
    return NextResponse.redirect(destinationUrl)
  }

  // No code provided - redirect to login
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', 'No authorization code provided')
  return NextResponse.redirect(loginUrl)
}
