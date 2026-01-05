import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Expert [id] API Route
 *
 * Handles operations on individual expert profiles.
 * GET is public for approved experts, other operations require authentication.
 *
 * GET - Get expert profile details
 * PATCH - Update expert profile (owner only)
 * DELETE - Delete expert profile (owner only)
 */

export interface UpdateExpertBody {
  bio?: string
  expertise_tags?: string[]
  session_rate?: number
  available?: boolean
  portfolio_url?: string
  years_experience?: number
}

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/expert/[id]
 * Get details of a specific expert
 *
 * Public endpoint for approved experts.
 * Unapproved experts are only visible to themselves.
 *
 * Returns:
 * - 200: Expert details with profile info
 * - 403: Forbidden - expert not approved (unless owner)
 * - 404: Expert not found
 * - 500: Server error
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Get current user (optional - for checking if viewing own profile)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Fetch expert with profile info
    const { data: expert, error: expertError } = await supabase
      .from('experts')
      .select(`
        *,
        profiles:id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (expertError) {
      if (expertError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not Found', message: 'Expert not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Database Error', message: expertError.message },
        { status: 500 }
      )
    }

    // If expert is not approved, only allow the owner to view
    if (!expert.approved && (!user || user.id !== expert.id)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'This expert profile is pending approval' },
        { status: 403 }
      )
    }

    // Add whether the viewer is the owner
    const isOwner = user?.id === expert.id

    // Hide email for non-owners
    if (!isOwner && expert.profiles) {
      delete (expert.profiles as Record<string, unknown>).email
    }

    return NextResponse.json({
      ...expert,
      is_owner: isOwner,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/expert/[id]
 * Update expert profile
 *
 * Only the expert themselves can update their profile.
 *
 * Request body:
 * - bio: string (optional) - Updated bio
 * - expertise_tags: string[] (optional) - Updated expertise tags
 * - session_rate: number (optional) - Updated rate in cents (1500-10000)
 * - available: boolean (optional) - Update availability status
 * - portfolio_url: string (optional) - Updated portfolio URL
 * - years_experience: number (optional) - Updated years of experience
 *
 * Returns:
 * - 200: Updated expert profile
 * - 400: Invalid request body
 * - 401: Unauthorized - user not authenticated
 * - 403: Forbidden - not the expert owner
 * - 404: Expert not found
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
        { error: 'Unauthorized', message: 'You must be logged in to update your expert profile' },
        { status: 401 }
      )
    }

    // Check if user owns this expert profile
    if (user.id !== id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only update your own expert profile' },
        { status: 403 }
      )
    }

    // Check if expert profile exists
    const { data: existingExpert, error: existingError } = await supabase
      .from('experts')
      .select('id, approved')
      .eq('id', id)
      .single()

    if (existingError) {
      if (existingError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not Found', message: 'Expert profile not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Database Error', message: existingError.message },
        { status: 500 }
      )
    }

    // Parse request body
    let body: UpdateExpertBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { bio, expertise_tags, session_rate, available, portfolio_url, years_experience } = body

    // Build update object
    const updates: Record<string, unknown> = {}

    // Validate and add bio
    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.trim().length === 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Bio must be a non-empty string' },
          { status: 400 }
        )
      }
      if (bio.length > 2000) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Bio must be 2000 characters or less' },
          { status: 400 }
        )
      }
      updates.bio = bio.trim()
    }

    // Validate and add expertise_tags
    if (expertise_tags !== undefined) {
      if (!Array.isArray(expertise_tags) || expertise_tags.length === 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Expertise tags must be a non-empty array' },
          { status: 400 }
        )
      }
      if (expertise_tags.length > 10) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Maximum 10 expertise tags allowed' },
          { status: 400 }
        )
      }
      const validatedTags = expertise_tags
        .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : '')
        .filter(tag => tag.length > 0)
      if (validatedTags.length === 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Expertise tags must be non-empty strings' },
          { status: 400 }
        )
      }
      updates.expertise_tags = validatedTags
    }

    // Validate and add session_rate
    if (session_rate !== undefined) {
      if (typeof session_rate !== 'number' || session_rate < 1500 || session_rate > 10000) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Session rate must be between $15 and $100 (1500-10000 cents)' },
          { status: 400 }
        )
      }
      updates.session_rate = session_rate
    }

    // Validate and add available (only for approved experts)
    if (available !== undefined) {
      if (typeof available !== 'boolean') {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Available must be a boolean' },
          { status: 400 }
        )
      }
      // Only approved experts can toggle availability
      if (!existingExpert.approved) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Cannot change availability until approved' },
          { status: 400 }
        )
      }
      updates.available = available
    }

    // Validate and add portfolio_url
    if (portfolio_url !== undefined) {
      if (portfolio_url !== null && typeof portfolio_url === 'string' && portfolio_url.trim().length > 0) {
        try {
          new URL(portfolio_url)
          updates.portfolio_url = portfolio_url.trim()
        } catch {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Portfolio URL must be a valid URL' },
            { status: 400 }
          )
        }
      } else {
        updates.portfolio_url = null
      }
    }

    // Validate and add years_experience
    if (years_experience !== undefined) {
      if (years_experience !== null) {
        if (typeof years_experience !== 'number' || years_experience < 0 || years_experience > 50) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Years of experience must be a number between 0 and 50' },
            { status: 400 }
          )
        }
        updates.years_experience = years_experience
      } else {
        updates.years_experience = null
      }
    }

    // Ensure there's something to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No valid updates provided' },
        { status: 400 }
      )
    }

    // Perform the update
    const { data: updatedExpert, error: updateError } = await supabase
      .from('experts')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        profiles:id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Database Error', message: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedExpert)
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/expert/[id]
 * Delete expert profile
 *
 * Only the expert themselves can delete their profile.
 * This removes the expert profile but keeps the user account.
 *
 * Returns:
 * - 200: Expert profile deleted
 * - 401: Unauthorized - user not authenticated
 * - 403: Forbidden - not the expert owner
 * - 404: Expert not found
 * - 409: Conflict - expert has active/scheduled sessions
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
        { error: 'Unauthorized', message: 'You must be logged in to delete your expert profile' },
        { status: 401 }
      )
    }

    // Check if user owns this expert profile
    if (user.id !== id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only delete your own expert profile' },
        { status: 403 }
      )
    }

    // Check if expert profile exists
    const { data: existingExpert, error: existingError } = await supabase
      .from('experts')
      .select('id')
      .eq('id', id)
      .single()

    if (existingError) {
      if (existingError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not Found', message: 'Expert profile not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Database Error', message: existingError.message },
        { status: 500 }
      )
    }

    // Check for active or scheduled sessions
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .eq('expert_id', id)
      .in('status', ['scheduled', 'pending_payment', 'paid', 'active'])
      .limit(1)

    if (sessionsError) {
      return NextResponse.json(
        { error: 'Database Error', message: sessionsError.message },
        { status: 500 }
      )
    }

    if (activeSessions && activeSessions.length > 0) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Cannot delete expert profile with active or scheduled sessions. Please cancel or complete all sessions first.' },
        { status: 409 }
      )
    }

    // Delete the expert profile
    const { error: deleteError } = await supabase
      .from('experts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Database Error', message: deleteError.message },
        { status: 500 }
      )
    }

    // Update user profile to remove expert flag
    await supabase
      .from('profiles')
      .update({ is_expert: false })
      .eq('id', id)

    return NextResponse.json({
      message: 'Expert profile deleted successfully',
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
