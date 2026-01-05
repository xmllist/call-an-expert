import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Session [id] API Route
 *
 * Handles operations on individual sessions.
 * All operations require authentication and appropriate permissions.
 *
 * GET - Get session details
 * PATCH - Update session (status, timing, cancellation)
 * DELETE - Cancel a session
 */

export interface UpdateSessionBody {
  status?: 'scheduled' | 'pending_payment' | 'paid' | 'active' | 'completed' | 'cancelled' | 'no_show'
  started_at?: string
  ended_at?: string
  payment_intent_id?: string
  cancellation_reason?: string
}

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/session/[id]
 * Get details of a specific session
 *
 * Only participants (user or expert) can view session details.
 *
 * Returns:
 * - 200: Session details with expert/user info
 * - 401: Unauthorized - user not authenticated
 * - 403: Forbidden - not a participant of this session
 * - 404: Session not found
 * - 500: Server error
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to view session details' },
        { status: 401 }
      )
    }

    // Fetch session with related data
    const { data: session, error: sessionError } = await supabase
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
            avatar_url,
            email
          )
        ),
        user:profiles!sessions_user_id_fkey (
          id,
          full_name,
          avatar_url,
          email
        ),
        help_request:help_requests (
          id,
          title,
          description,
          screenshot_url,
          context
        )
      `)
      .eq('id', id)
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not Found', message: 'Session not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Database Error', message: sessionError.message },
        { status: 500 }
      )
    }

    // Check if user is a participant
    if (session.user_id !== user.id && session.expert_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this session' },
        { status: 403 }
      )
    }

    // Add user role in this session
    const userRole = session.user_id === user.id ? 'user' : 'expert'

    return NextResponse.json({
      ...session,
      viewer_role: userRole,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/session/[id]
 * Update session status or details
 *
 * Allowed updates depend on user role and current session status:
 * - Users can: cancel scheduled/pending_payment sessions
 * - Experts can: cancel, start, end sessions
 * - Both can: add cancellation reason when cancelling
 *
 * Request body:
 * - status: string (optional) - New session status
 * - started_at: string (optional) - Session start time (expert only)
 * - ended_at: string (optional) - Session end time (expert only)
 * - payment_intent_id: string (optional) - Stripe payment intent ID
 * - cancellation_reason: string (optional) - Reason for cancellation
 *
 * Returns:
 * - 200: Updated session
 * - 400: Invalid update
 * - 401: Unauthorized - user not authenticated
 * - 403: Forbidden - not allowed to make this update
 * - 404: Session not found
 * - 500: Server error
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to update a session' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: UpdateSessionBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Fetch current session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not Found', message: 'Session not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Database Error', message: sessionError.message },
        { status: 500 }
      )
    }

    // Check if user is a participant
    const isUser = session.user_id === user.id
    const isExpert = session.expert_id === user.id

    if (!isUser && !isExpert) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this session' },
        { status: 403 }
      )
    }

    const { status, started_at, ended_at, payment_intent_id, cancellation_reason } = body

    // Build update object
    const updates: Record<string, unknown> = {}

    // Handle status transitions
    if (status) {
      const currentStatus = session.status
      const validStatuses = ['scheduled', 'pending_payment', 'paid', 'active', 'completed', 'cancelled', 'no_show']

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Bad Request', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }

      // Validate status transitions based on role
      if (status === 'cancelled') {
        // Both user and expert can cancel
        if (!['scheduled', 'pending_payment', 'paid'].includes(currentStatus)) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Can only cancel sessions that are scheduled, pending payment, or paid' },
            { status: 400 }
          )
        }
        updates.status = 'cancelled'
        updates.cancelled_at = new Date().toISOString()
        if (cancellation_reason) {
          updates.cancellation_reason = cancellation_reason
        }
      } else if (status === 'active') {
        // Only expert can start session
        if (!isExpert) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'Only the expert can start a session' },
            { status: 403 }
          )
        }
        if (currentStatus !== 'paid') {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Session must be paid before starting' },
            { status: 400 }
          )
        }
        updates.status = 'active'
        updates.started_at = started_at || new Date().toISOString()
      } else if (status === 'completed') {
        // Only expert can complete session
        if (!isExpert) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'Only the expert can complete a session' },
            { status: 403 }
          )
        }
        if (currentStatus !== 'active') {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Session must be active to be completed' },
            { status: 400 }
          )
        }
        updates.status = 'completed'
        updates.ended_at = ended_at || new Date().toISOString()
      } else if (status === 'no_show') {
        // Only expert can mark no-show
        if (!isExpert) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'Only the expert can mark a session as no-show' },
            { status: 403 }
          )
        }
        if (!['paid', 'active'].includes(currentStatus)) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Can only mark no-show for paid or active sessions' },
            { status: 400 }
          )
        }
        updates.status = 'no_show'
      } else if (status === 'paid') {
        // Typically set via webhook, but allow manual update for admin purposes
        if (currentStatus !== 'pending_payment') {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Can only mark as paid from pending_payment status' },
            { status: 400 }
          )
        }
        updates.status = 'paid'
      }
    }

    // Handle payment_intent_id update (typically from payment flow)
    if (payment_intent_id) {
      if (!isUser) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Only the session user can set payment intent' },
          { status: 403 }
        )
      }
      updates.payment_intent_id = payment_intent_id
    }

    // Handle started_at update
    if (started_at && !updates.started_at) {
      if (!isExpert) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Only the expert can update session start time' },
          { status: 403 }
        )
      }
      updates.started_at = started_at
    }

    // Handle ended_at update
    if (ended_at && !updates.ended_at) {
      if (!isExpert) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Only the expert can update session end time' },
          { status: 403 }
        )
      }
      updates.ended_at = ended_at
    }

    // Ensure there's something to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No valid updates provided' },
        { status: 400 }
      )
    }

    // Perform the update
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
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
        ),
        user:profiles!sessions_user_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Database Error', message: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedSession)
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/session/[id]
 * Cancel a session
 *
 * Shortcut for PATCH with status='cancelled'.
 * Can only cancel sessions that are not yet active or completed.
 *
 * Query parameters:
 * - reason: string (optional) - Cancellation reason
 *
 * Returns:
 * - 200: Session cancelled
 * - 400: Session cannot be cancelled
 * - 401: Unauthorized - user not authenticated
 * - 403: Forbidden - not a participant
 * - 404: Session not found
 * - 500: Server error
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to cancel a session' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const reason = searchParams.get('reason')

    // Fetch current session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not Found', message: 'Session not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Database Error', message: sessionError.message },
        { status: 500 }
      )
    }

    // Check if user is a participant
    if (session.user_id !== user.id && session.expert_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this session' },
        { status: 403 }
      )
    }

    // Check if session can be cancelled
    if (!['scheduled', 'pending_payment', 'paid'].includes(session.status)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Cannot cancel session with status: ${session.status}` },
        { status: 400 }
      )
    }

    // Update to cancelled
    const updates: Record<string, unknown> = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    }

    if (reason) {
      updates.cancellation_reason = reason
    }

    const { data: cancelledSession, error: updateError } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Database Error', message: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Session cancelled successfully',
      session: cancelledSession,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
