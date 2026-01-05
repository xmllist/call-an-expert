import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Expert API Route
 *
 * Handles expert profile operations including listing available experts
 * and creating new expert applications.
 *
 * GET - List experts (public, shows only approved experts)
 * POST - Apply to become an expert (requires authentication)
 */

export interface CreateExpertBody {
  bio: string
  expertise_tags: string[]
  session_rate: number
  portfolio_url?: string
  years_experience?: number
}

export interface ExpertResponse {
  id: string
  bio: string | null
  expertise_tags: string[]
  session_rate: number
  available: boolean
  rating: number
  total_sessions: number
  approved: boolean
  stripe_account_id: string | null
  portfolio_url: string | null
  years_experience: number | null
  created_at: string
  updated_at: string
  profiles?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    email?: string
  }
}

/**
 * GET /api/expert
 * List all approved experts
 *
 * Query parameters:
 * - available: boolean (optional) - Filter by availability (default: all)
 * - tag: string (optional) - Filter by expertise tag (can be multiple)
 * - search: string (optional) - Search in bio and expertise tags
 * - min_rating: number (optional) - Minimum rating filter
 * - max_rate: number (optional) - Maximum session rate filter (in cents)
 * - sort: string (optional) - Sort by: 'rating', 'rate_low', 'rate_high', 'sessions' (default: 'rating')
 * - limit: number (optional) - Maximum number of results (default: 50, max: 100)
 * - offset: number (optional) - Number of results to skip (default: 0)
 *
 * Returns:
 * - 200: Array of experts with profile information
 * - 500: Server error
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const available = searchParams.get('available')
    const tags = searchParams.getAll('tag')
    const search = searchParams.get('search')
    const minRating = searchParams.get('min_rating')
    const maxRate = searchParams.get('max_rate')
    const sort = searchParams.get('sort') || 'rating'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build base query for approved experts with profile info
    let query = supabase
      .from('experts')
      .select(`
        *,
        profiles:id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('approved', true)

    // Apply availability filter
    if (available !== null) {
      query = query.eq('available', available === 'true')
    }

    // Apply expertise tag filter (OR matching)
    if (tags.length > 0) {
      query = query.overlaps('expertise_tags', tags)
    }

    // Apply search filter (bio or expertise tags contain the search term)
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase()
      query = query.or(`bio.ilike.%${searchTerm}%,expertise_tags.cs.{${searchTerm}}`)
    }

    // Apply minimum rating filter
    if (minRating) {
      const rating = parseFloat(minRating)
      if (!isNaN(rating) && rating >= 0 && rating <= 5) {
        query = query.gte('rating', rating)
      }
    }

    // Apply maximum rate filter
    if (maxRate) {
      const rate = parseInt(maxRate, 10)
      if (!isNaN(rate) && rate > 0) {
        query = query.lte('session_rate', rate)
      }
    }

    // Apply sorting
    switch (sort) {
      case 'rating':
        query = query.order('rating', { ascending: false }).order('total_sessions', { ascending: false })
        break
      case 'rate_low':
        query = query.order('session_rate', { ascending: true })
        break
      case 'rate_high':
        query = query.order('session_rate', { ascending: false })
        break
      case 'sessions':
        query = query.order('total_sessions', { ascending: false })
        break
      default:
        query = query.order('rating', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: experts, error: selectError } = await query

    if (selectError) {
      return NextResponse.json(
        { error: 'Database Error', message: selectError.message },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('experts')
      .select('*', { count: 'exact', head: true })
      .eq('approved', true)

    if (countError) {
      return NextResponse.json(
        { error: 'Database Error', message: countError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      experts: experts || [],
      total: count || 0,
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
 * POST /api/expert
 * Apply to become an expert
 *
 * Request body:
 * - bio: string (required) - Expert's bio/description
 * - expertise_tags: string[] (required) - Array of expertise areas
 * - session_rate: number (required) - Rate per session in cents (1500-10000)
 * - portfolio_url: string (optional) - Portfolio/website URL
 * - years_experience: number (optional) - Years of experience
 *
 * Returns:
 * - 201: Expert application created (pending approval)
 * - 400: Invalid request body
 * - 401: Unauthorized - user not authenticated
 * - 409: Conflict - user already has expert profile
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
        { error: 'Unauthorized', message: 'You must be logged in to apply as an expert' },
        { status: 401 }
      )
    }

    // Check if user already has an expert profile
    const { data: existingExpert } = await supabase
      .from('experts')
      .select('id, approved')
      .eq('id', user.id)
      .single()

    if (existingExpert) {
      if (existingExpert.approved) {
        return NextResponse.json(
          { error: 'Conflict', message: 'You are already an approved expert' },
          { status: 409 }
        )
      } else {
        return NextResponse.json(
          { error: 'Conflict', message: 'You already have a pending expert application' },
          { status: 409 }
        )
      }
    }

    // Parse request body
    let body: CreateExpertBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Validate required fields
    const { bio, expertise_tags, session_rate, portfolio_url, years_experience } = body

    if (!bio || typeof bio !== 'string' || bio.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Bio is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (bio.length > 2000) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Bio must be 2000 characters or less' },
        { status: 400 }
      )
    }

    if (!Array.isArray(expertise_tags) || expertise_tags.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'At least one expertise tag is required' },
        { status: 400 }
      )
    }

    if (expertise_tags.length > 10) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Maximum 10 expertise tags allowed' },
        { status: 400 }
      )
    }

    // Validate each tag is a non-empty string
    const validatedTags = expertise_tags
      .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : '')
      .filter(tag => tag.length > 0)

    if (validatedTags.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Expertise tags must be non-empty strings' },
        { status: 400 }
      )
    }

    if (typeof session_rate !== 'number' || session_rate < 1500 || session_rate > 10000) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Session rate must be between $15 and $100 (1500-10000 cents)' },
        { status: 400 }
      )
    }

    // Validate portfolio URL if provided
    if (portfolio_url && typeof portfolio_url === 'string') {
      try {
        new URL(portfolio_url)
      } catch {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Portfolio URL must be a valid URL' },
          { status: 400 }
        )
      }
    }

    // Validate years_experience if provided
    if (years_experience !== undefined) {
      if (typeof years_experience !== 'number' || years_experience < 0 || years_experience > 50) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Years of experience must be a number between 0 and 50' },
          { status: 400 }
        )
      }
    }

    // Update the user's profile to mark as expert (pending approval)
    await supabase
      .from('profiles')
      .update({ is_expert: true })
      .eq('id', user.id)

    // Create the expert profile
    const { data: expert, error: insertError } = await supabase
      .from('experts')
      .insert({
        id: user.id,
        bio: bio.trim(),
        expertise_tags: validatedTags,
        session_rate,
        portfolio_url: portfolio_url || null,
        years_experience: years_experience || null,
        available: false, // Not available until approved
        approved: false, // Pending admin approval
        rating: 0,
        total_sessions: 0,
      })
      .select(`
        *,
        profiles:id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      // If expert insert fails, revert is_expert flag
      await supabase
        .from('profiles')
        .update({ is_expert: false })
        .eq('id', user.id)

      return NextResponse.json(
        { error: 'Database Error', message: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Expert application submitted successfully. Pending admin approval.',
        expert,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
