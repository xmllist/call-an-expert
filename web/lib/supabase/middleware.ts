import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Updates the user session by refreshing the auth token if needed.
 * This function should be called in the Next.js middleware to ensure
 * the user's session stays fresh and valid.
 *
 * The middleware client uses NextRequest/NextResponse to read and write
 * cookies, which is different from the server client that uses next/headers.
 */
export async function updateSession(request: NextRequest) {
  // Create a response that we can modify
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // First, set cookies on the request for downstream components
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Then recreate the response with updated request
          supabaseResponse = NextResponse.next({
            request,
          })
          // Finally, set cookies on the response for the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use supabase.auth.getSession() inside of middleware.
  // It doesn't read the cookie from the request, but from the current browser.
  // getUser() will refresh the session if expired, updating cookies as needed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
