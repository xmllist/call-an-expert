import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Rating API Route
 *
 * Handles rating operations for post-session reviews.
 * Both users and experts can rate each other after a session is completed.
 *
 * POST - Create a new rating for a completed session
 * GET - List ratings for the authenticated user (given or received)
 */

export interface CreateRatingBody {
  session_id: string
  score: number
  comment?: string
}

export interface RatingResponse {
  id: string
  session_id: string
  rater_id: string
  ratee_id: string
  score: number
  comment: string | null
  created_at: string
  rater?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  ratee?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  session?: {
    id: string
    scheduled_at: string
    status: string
  }
}

/**
 * POST /api/rating
 * Create a new rating for a completed session
 *
 * Request body:
 * - session_id: string (required) - UUID of the completed session
 * - score: number (required) - Rating score from 1 to 5
 * - comment: string (optional) - Optional review comment
 *
 * Returns:
 * - 201: Rating created successfully
 * - 400: Invalid request body or session not completed
 * - 401: Unauthorized - user not authenticated
 * - 403: Forbidden - user is not a participant of the session
 * - 404: Session not found
 * - 409: User has already rated this session
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
        { error: 'Unauthorized', message: 'You must be logged in to submit a rating' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: CreateRatingBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Validate required fields
    const { session_id, score, comment } = body

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'session_id is required and must be a valid UUID' },
        { status: 400 }
      )
    }

    if (typeof score !== 'number' || !Number.isInteger(score)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'score is required and must be an integer' },
        { status: 400 }
      )
    }

    if (score < 1 || score > 5) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'score must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Validate comment if provided
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        return NextResponse.json(
          { error: 'Bad Request', message: 'comment must be a string' },
          { status: 400 }
        )
      }
      if (comment.length > 1000) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'comment must be 1000 characters or less' },
          { status: 400 }
        )
      }
    }

    // Fetch the session to validate
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id, expert_id, status')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if user is a participant of the session
    const isUser = session.user_id === user.id
    const isExpert = session.expert_id === user.id

    if (!isUser && !isExpert) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You are not a participant of this session' },
        { status: 403 }
      )
    }

    // Check if session is completed
    if (session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Ratings can only be submitted for completed sessions' },
        { status: 400 }
      )
    }

    // Determine ratee_id (the other participant)
    const ratee_id = isUser ? session.expert_id : session.user_id

    // Check if user has already rated this session
    const { data: existingRating, error: existingError } = await supabase
      .from('ratings')
      .select('id')
      .eq('session_id', session_id)
      .eq('rater_id', user.id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 = No rows found (expected if no rating exists)
      return NextResponse.json(
        { error: 'Database Error', message: existingError.message },
        { status: 500 }
      )
    }

    if (existingRating) {
      return NextResponse.json(
        { error: 'Conflict', message: 'You have already rated this session' },
        { status: 409 }
      )
    }

    // Create the rating
    const { data: rating, error: insertError } = await supabase
      .from('ratings')
      .insert({
        session_id,
        rater_id: user.id,
        ratee_id,
        score,
        comment: comment?.trim() || null,
      })
      .select(`
        *,
        rater:profiles!ratings_rater_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        ratee:profiles!ratings_ratee_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Conflict', message: 'You have already rated this session' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Database Error', message: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(rating, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rating
 * List ratings for the authenticated user
 *
 * Query parameters:
 * - type: string (optional) - Filter by type: 'given', 'received', or 'all' (default: 'all')
 * - session_id: string (optional) - Get ratings for a specific session
 * - user_id: string (optional) - Get ratings received by a specific user (public data)
 * - limit: number (optional) - Maximum number of results (default: 50, max: 100)
 * - offset: number (optional) - Number of results to skip (default: 0)
 *
 * Returns:
 * - 200: Array of ratings with rater/ratee details
 * - 401: Unauthorized - user not authenticated (except for public user_id queries)
 * - 500: Server error
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const sessionId = searchParams.get('session_id')
    const userId = searchParams.get('user_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // For public ratings queries (by user_id), auth is optional
    let currentUserId: string | null = null
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (!authError && user) {
      currentUserId = user.id
    }

    // If querying personal ratings (given/received), require auth
    if (!userId && !sessionId && !currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to view your ratings' },
        { status: 401 }
      )
    }

    // Build query
    let query = supabase
      .from('ratings')
      .select(`
        *,
        rater:profiles!ratings_rater_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        ratee:profiles!ratings_ratee_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        session:sessions!ratings_session_id_fkey (
          id,
          scheduled_at,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters based on parameters
    if (sessionId) {
      // Get all ratings for a specific session
      query = query.eq('session_id', sessionId)

      // Verify user is a participant (for privacy) if authenticated
      if (currentUserId) {
        const { data: session } = await supabase
          .from('sessions')
          .select('user_id, expert_id')
          .eq('id', sessionId)
          .single()

        if (session && session.user_id !== currentUserId && session.expert_id !== currentUserId) {
          // User is not a participant, only show public ratings
          query = query.eq('ratee_id', session.expert_id)
        }
      }
    } else if (userId) {
      // Get ratings received by a specific user (public)
      query = query.eq('ratee_id', userId)
    } else if (currentUserId) {
      // Get ratings given or received by the authenticated user
      if (type === 'given') {
        query = query.eq('rater_id', currentUserId)
      } else if (type === 'received') {
        query = query.eq('ratee_id', currentUserId)
      } else {
        // 'all' - get both given and received
        query = query.or(`rater_id.eq.${currentUserId},ratee_id.eq.${currentUserId}`)
      }
    }

    const { data: ratings, error: selectError } = await query

    if (selectError) {
      return NextResponse.json(
        { error: 'Database Error', message: selectError.message },
        { status: 500 }
      )
    }

    // Calculate summary statistics if viewing ratings for a specific user
    let summary = null
    if (userId || (currentUserId && type === 'received')) {
      const targetUserId = userId || currentUserId
      const { data: statsData } = await supabase
        .from('ratings')
        .select('score')
        .eq('ratee_id', targetUserId)

      if (statsData && statsData.length > 0) {
        const totalRatings = statsData.length
        const averageRating = statsData.reduce((sum, r) => sum + r.score, 0) / totalRatings
        const distribution = statsData.reduce(
          (acc, r) => {
            acc[r.score] = (acc[r.score] || 0) + 1
            return acc
          },
          {} as Record<number, number>
        )

        summary = {
          total_ratings: totalRatings,
          average_rating: Math.round(averageRating * 100) / 100,
          distribution: {
            1: distribution[1] || 0,
            2: distribution[2] || 0,
            3: distribution[3] || 0,
            4: distribution[4] || 0,
            5: distribution[5] || 0,
          },
        }
      }
    }

    return NextResponse.json({
      ratings: ratings || [],
      summary,
      total: ratings?.length || 0,
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

/**
 * DELETE /api/rating
 * Delete a rating
 * Note: For deleting specific ratings, use /api/rating/[id] route
 * This endpoint is not implemented - use the [id] route instead
 */
export async function DELETE() {
  return NextResponse.json(
    { error: 'Method Not Allowed', message: 'Use DELETE /api/rating/{id} to delete a specific rating' },
    { status: 405 }
  )
}
