import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Session API Route
 *
 * Handles session CRUD operations for booking and managing expert sessions.
 * All operations require authentication.
 *
 * POST - Create a new session (book with expert)
 * GET - List user's sessions
 */

export interface CreateSessionBody {
  expert_id: string
  help_request_id?: string
  scheduled_at: string
  duration_minutes?: number
  amount: number
}

export interface SessionResponse {
  id: string
  help_request_id: string | null
  user_id: string
  expert_id: string
  scheduled_at: string
  started_at: string | null
  ended_at: string | null
  duration_minutes: number
  status: string
  payment_intent_id: string | null
  amount: number
  platform_fee: number
  expert_payout: number
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  expert?: {
    id: string
    bio: string | null
    expertise_tags: string[]
    session_rate: number
    rating: number
    profiles: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
  }
  user?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

/**
 * POST /api/session
 * Create a new session (book with an expert)
 *
 * Request body:
 * - expert_id: string (required) - UUID of the expert to book
 * - help_request_id: string (optional) - UUID of associated help request
 * - scheduled_at: string (required) - ISO datetime for scheduled session
 * - duration_minutes: number (optional) - Session duration, default 15
 * - amount: number (required) - Amount in cents
 *
 * Returns:
 * - 201: Session created successfully
 * - 400: Invalid request body
 * - 401: Unauthorized - user not authenticated
 * - 404: Expert not found or unavailable
 * - 409: Expert already booked for this time slot
 * - 500: Server error
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to book a session' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: CreateSessionBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Validate required fields
    const { expert_id, help_request_id, scheduled_at, duration_minutes, amount } = body

    if (!expert_id || typeof expert_id !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'expert_id is required and must be a valid UUID' },
        { status: 400 }
      )
    }

    if (!scheduled_at || typeof scheduled_at !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'scheduled_at is required and must be a valid ISO datetime' },
        { status: 400 }
      )
    }

    // Validate scheduled_at is a valid date
    const scheduledDate = new Date(scheduled_at)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'scheduled_at must be a valid ISO datetime string' },
        { status: 400 }
      )
    }

    // Ensure session is scheduled in the future
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Session must be scheduled in the future' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'amount is required and must be a positive number (in cents)' },
        { status: 400 }
      )
    }

    // Validate duration_minutes if provided
    const sessionDuration = duration_minutes || 15
    if (sessionDuration < 5 || sessionDuration > 120) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'duration_minutes must be between 5 and 120' },
        { status: 400 }
      )
    }

    // Verify expert exists and is available
    const { data: expert, error: expertError } = await supabase
      .from('experts')
      .select('id, available, approved, session_rate')
      .eq('id', expert_id)
      .single()

    if (expertError || !expert) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Expert not found' },
        { status: 404 }
      )
    }

    if (!expert.approved) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Expert is not approved for sessions' },
        { status: 400 }
      )
    }

    if (!expert.available) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Expert is currently unavailable' },
        { status: 409 }
      )
    }

    // Check if user is trying to book themselves
    if (expert_id === user.id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'You cannot book a session with yourself' },
        { status: 400 }
      )
    }

    // Verify help_request_id if provided
    if (help_request_id) {
      const { data: helpRequest, error: helpRequestError } = await supabase
        .from('help_requests')
        .select('id, user_id')
        .eq('id', help_request_id)
        .single()

      if (helpRequestError || !helpRequest) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Help request not found' },
          { status: 404 }
        )
      }

      if (helpRequest.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You do not own this help request' },
          { status: 403 }
        )
      }
    }

    // Check for scheduling conflicts (expert already booked at this time)
    const sessionStart = scheduledDate.toISOString()
    const sessionEnd = new Date(scheduledDate.getTime() + sessionDuration * 60 * 1000).toISOString()

    const { data: conflicts, error: conflictError } = await supabase
      .from('sessions')
      .select('id')
      .eq('expert_id', expert_id)
      .in('status', ['scheduled', 'pending_payment', 'paid', 'active'])
      .or(`and(scheduled_at.lte.${sessionEnd},scheduled_at.gte.${new Date(scheduledDate.getTime() - sessionDuration * 60 * 1000).toISOString()})`)

    if (conflictError) {
      return NextResponse.json(
        { error: 'Database Error', message: conflictError.message },
        { status: 500 }
      )
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Expert already has a session scheduled at this time' },
        { status: 409 }
      )
    }

    // Calculate platform fee (10%) and expert payout (90%)
    const platformFee = Math.round(amount * 0.10)
    const expertPayout = amount - platformFee

    // Create the session
    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        expert_id,
        help_request_id: help_request_id || null,
        scheduled_at: sessionStart,
        duration_minutes: sessionDuration,
        status: 'pending_payment',
        amount,
        platform_fee: platformFee,
        expert_payout: expertPayout,
      })
      .select(`
        *,
        expert:experts!sessions_expert_id_fkey (
          id,
          bio,
          expertise_tags,
          session_rate,
          rating,
          profiles:id (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: 'Database Error', message: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(session, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/session
 * List all sessions for the authenticated user (as user or expert)
 *
 * Query parameters:
 * - role: string (optional) - Filter by role: 'user', 'expert', or 'all' (default: 'all')
 * - status: string (optional) - Filter by status
 * - upcoming: boolean (optional) - Only show upcoming sessions (default: false)
 * - limit: number (optional) - Maximum number of results (default: 50, max: 100)
 * - offset: number (optional) - Number of results to skip (default: 0)
 *
 * Returns:
 * - 200: Array of sessions with expert/user details
 * - 401: Unauthorized - user not authenticated
 * - 500: Server error
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to view sessions' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || 'all'
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build query for sessions where user is the client
    let userSessionsQuery = supabase
      .from('sessions')
      .select(`
        *,
        expert:experts!sessions_expert_id_fkey (
          id,
          bio,
          expertise_tags,
          session_rate,
          rating,
          profiles:id (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true })

    // Build query for sessions where user is the expert
    let expertSessionsQuery = supabase
      .from('sessions')
      .select(`
        *,
        user:profiles!sessions_user_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('expert_id', user.id)
      .order('scheduled_at', { ascending: true })

    // Apply status filter
    if (status) {
      const validStatuses = ['scheduled', 'pending_payment', 'paid', 'active', 'completed', 'cancelled', 'no_show']
      if (validStatuses.includes(status)) {
        userSessionsQuery = userSessionsQuery.eq('status', status)
        expertSessionsQuery = expertSessionsQuery.eq('status', status)
      }
    }

    // Apply upcoming filter
    if (upcoming) {
      const now = new Date().toISOString()
      userSessionsQuery = userSessionsQuery.gte('scheduled_at', now)
      expertSessionsQuery = expertSessionsQuery.gte('scheduled_at', now)
    }

    // Execute queries based on role filter
    let sessions: SessionResponse[] = []

    if (role === 'user' || role === 'all') {
      const { data: userSessions, error: userError } = await userSessionsQuery

      if (userError) {
        return NextResponse.json(
          { error: 'Database Error', message: userError.message },
          { status: 500 }
        )
      }

      if (userSessions) {
        sessions = [...sessions, ...userSessions as unknown as SessionResponse[]]
      }
    }

    if (role === 'expert' || role === 'all') {
      const { data: expertSessions, error: expertError } = await expertSessionsQuery

      if (expertError) {
        return NextResponse.json(
          { error: 'Database Error', message: expertError.message },
          { status: 500 }
        )
      }

      if (expertSessions) {
        sessions = [...sessions, ...expertSessions as unknown as SessionResponse[]]
      }
    }

    // Sort combined sessions by scheduled_at
    sessions.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

    // Apply pagination
    const paginatedSessions = sessions.slice(offset, offset + limit)

    return NextResponse.json({
      sessions: paginatedSessions,
      total: sessions.length,
      limit,
      offset,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
