import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Help Request API Route
 *
 * Handles help request operations from the Chrome extension and web app.
 * All operations require authentication.
 *
 * POST - Create a new help request
 * GET - List user's help requests
 */

export interface HelpRequestBody {
  title: string
  description: string
  screenshot_url?: string
  context?: Record<string, unknown>
}

export interface HelpRequestResponse {
  id: string
  user_id: string
  title: string
  description: string
  screenshot_url: string | null
  context: Record<string, unknown>
  status: string
  matched_expert_ids: string[]
  created_at: string
  updated_at: string
}

/**
 * POST /api/help-request
 * Create a new help request
 *
 * Request body:
 * - title: string (required) - Brief description of the issue
 * - description: string (required) - Detailed description of the problem
 * - screenshot_url: string (optional) - URL to screenshot in storage
 * - context: object (optional) - Additional context (page URL, error messages, etc.)
 *
 * Returns:
 * - 201: Help request created successfully
 * - 400: Invalid request body
 * - 401: Unauthorized - user not authenticated
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
        { error: 'Unauthorized', message: 'You must be logged in to submit a help request' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: HelpRequestBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Validate required fields
    const { title, description, screenshot_url, context } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Title is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Title must be 200 characters or less' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Description is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Create the help request
    const { data: helpRequest, error: insertError } = await supabase
      .from('help_requests')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        screenshot_url: screenshot_url || null,
        context: context || {},
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: 'Database Error', message: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(helpRequest, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/help-request
 * List all help requests for the authenticated user
 *
 * Query parameters:
 * - status: string (optional) - Filter by status (pending, matched, in_progress, resolved, cancelled)
 * - limit: number (optional) - Maximum number of results (default: 50, max: 100)
 * - offset: number (optional) - Number of results to skip (default: 0)
 *
 * Returns:
 * - 200: Array of help requests
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
        { error: 'Unauthorized', message: 'You must be logged in to view help requests' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build query
    let query = supabase
      .from('help_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter if provided
    if (status) {
      const validStatuses = ['pending', 'matched', 'in_progress', 'resolved', 'cancelled']
      if (validStatuses.includes(status)) {
        query = query.eq('status', status)
      }
    }

    const { data: helpRequests, error: selectError } = await query

    if (selectError) {
      return NextResponse.json(
        { error: 'Database Error', message: selectError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(helpRequests || [])
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/help-request
 * Delete a help request
 * Note: For deleting specific requests, use /api/help-request/[id] route
 * This endpoint is not implemented - use the [id] route instead
 */
export async function DELETE(request: Request) {
  return NextResponse.json(
    { error: 'Method Not Allowed', message: 'Use DELETE /api/help-request/{id} to delete a specific request' },
    { status: 405 }
  )
}
