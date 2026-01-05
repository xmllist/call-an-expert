import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  matchExperts,
  matchExpertsByTags,
  extractTagsFromRequest,
  type Expert,
  type HelpRequest,
  type MatchedExpert,
  type MatchingOptions,
} from '@/lib/matching/algorithm'

/**
 * Expert Matching API Route
 *
 * Matches help requests with available experts based on expertise tags.
 * Supports two modes:
 * 1. Match by help request ID - extracts tags from the request and finds matching experts
 * 2. Match by explicit tags - directly matches against provided expertise tags
 *
 * GET - Match experts for a help request or by tags
 * POST - Match experts with custom options
 */

export interface MatchExpertsQuery {
  help_request_id?: string
  tags?: string
  limit?: string
  min_score?: string
  available_only?: string
}

export interface MatchExpertsBody {
  help_request_id?: string
  tags?: string[]
  options?: MatchingOptions
}

export interface MatchExpertsResponse {
  experts: MatchedExpert[]
  request_tags?: string[]
  total_matched: number
}

/**
 * GET /api/match-experts
 * Match experts based on help request ID or explicit tags
 *
 * Query parameters:
 * - help_request_id: string (optional) - ID of help request to match against
 * - tags: string (optional) - Comma-separated list of expertise tags
 * - limit: number (optional) - Maximum results (default: 10, max: 50)
 * - min_score: number (optional) - Minimum match score 0-1 (default: 0.1)
 * - available_only: boolean (optional) - Only return available experts (default: true)
 *
 * Returns:
 * - 200: Array of matched experts with scores
 * - 400: Invalid query parameters
 * - 401: Unauthorized - user not authenticated
 * - 404: Help request not found
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
        { error: 'Unauthorized', message: 'You must be logged in to find experts' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const helpRequestId = searchParams.get('help_request_id')
    const tagsParam = searchParams.get('tags')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)
    const minScore = Math.max(0, Math.min(1, parseFloat(searchParams.get('min_score') || '0.1')))

    // Validate parameters
    if (!helpRequestId && !tagsParam) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Either help_request_id or tags query parameter is required',
        },
        { status: 400 }
      )
    }

    // Fetch all available approved experts with their profiles
    const { data: experts, error: expertsError } = await supabase
      .from('experts')
      .select(`
        *,
        profiles:id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('approved', true)
      .eq('available', true)

    if (expertsError) {
      return NextResponse.json(
        { error: 'Database Error', message: expertsError.message },
        { status: 500 }
      )
    }

    if (!experts || experts.length === 0) {
      return NextResponse.json({
        experts: [],
        total_matched: 0,
        message: 'No experts currently available',
      })
    }

    const options: MatchingOptions = {
      maxResults: limit,
      minMatchScore: minScore,
    }

    let matchedExperts: MatchedExpert[] = []
    let requestTags: string[] | undefined

    if (helpRequestId) {
      // Match by help request
      const { data: helpRequest, error: requestError } = await supabase
        .from('help_requests')
        .select('*')
        .eq('id', helpRequestId)
        .single()

      if (requestError) {
        if (requestError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Not Found', message: 'Help request not found' },
            { status: 404 }
          )
        }
        return NextResponse.json(
          { error: 'Database Error', message: requestError.message },
          { status: 500 }
        )
      }

      // Check that the user owns this help request or is an expert matched to it
      if (helpRequest.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You do not have access to this help request' },
          { status: 403 }
        )
      }

      requestTags = extractTagsFromRequest(helpRequest as HelpRequest)
      matchedExperts = matchExperts(experts as Expert[], helpRequest as HelpRequest, options)
    } else if (tagsParam) {
      // Match by explicit tags
      const tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean)

      if (tags.length === 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'At least one tag is required' },
          { status: 400 }
        )
      }

      requestTags = tags
      matchedExperts = matchExpertsByTags(experts as Expert[], tags, options)
    }

    const response: MatchExpertsResponse = {
      experts: matchedExperts,
      request_tags: requestTags,
      total_matched: matchedExperts.length,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/match-experts
 * Match experts with custom options
 *
 * Request body:
 * - help_request_id: string (optional) - ID of help request to match against
 * - tags: string[] (optional) - Array of expertise tags to match
 * - options: MatchingOptions (optional) - Custom matching options
 *   - minMatchScore: number (0-1) - Minimum match score
 *   - maxResults: number - Maximum results
 *   - requireStripeAccount: boolean - Only experts with Stripe account
 *   - tagMatchWeight: number (0-1) - Weight for tag matching
 *   - ratingWeight: number (0-1) - Weight for rating
 *
 * Returns:
 * - 200: Array of matched experts with scores
 * - 400: Invalid request body
 * - 401: Unauthorized - user not authenticated
 * - 404: Help request not found
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
        { error: 'Unauthorized', message: 'You must be logged in to find experts' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: MatchExpertsBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { help_request_id, tags, options: userOptions } = body

    // Validate parameters
    if (!help_request_id && (!tags || tags.length === 0)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Either help_request_id or tags array is required',
        },
        { status: 400 }
      )
    }

    // Fetch all available approved experts with their profiles
    const { data: experts, error: expertsError } = await supabase
      .from('experts')
      .select(`
        *,
        profiles:id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('approved', true)
      .eq('available', true)

    if (expertsError) {
      return NextResponse.json(
        { error: 'Database Error', message: expertsError.message },
        { status: 500 }
      )
    }

    if (!experts || experts.length === 0) {
      return NextResponse.json({
        experts: [],
        total_matched: 0,
        message: 'No experts currently available',
      })
    }

    // Merge user options with defaults
    const options: MatchingOptions = {
      maxResults: Math.min(userOptions?.maxResults || 10, 50),
      minMatchScore: Math.max(0, Math.min(1, userOptions?.minMatchScore || 0.1)),
      requireStripeAccount: userOptions?.requireStripeAccount || false,
      tagMatchWeight: userOptions?.tagMatchWeight,
      ratingWeight: userOptions?.ratingWeight,
    }

    let matchedExperts: MatchedExpert[] = []
    let requestTags: string[] | undefined

    if (help_request_id) {
      // Match by help request
      const { data: helpRequest, error: requestError } = await supabase
        .from('help_requests')
        .select('*')
        .eq('id', help_request_id)
        .single()

      if (requestError) {
        if (requestError.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Not Found', message: 'Help request not found' },
            { status: 404 }
          )
        }
        return NextResponse.json(
          { error: 'Database Error', message: requestError.message },
          { status: 500 }
        )
      }

      // Check that the user owns this help request
      if (helpRequest.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You do not have access to this help request' },
          { status: 403 }
        )
      }

      requestTags = extractTagsFromRequest(helpRequest as HelpRequest)
      matchedExperts = matchExperts(experts as Expert[], helpRequest as HelpRequest, options)
    } else if (tags && tags.length > 0) {
      // Match by explicit tags
      requestTags = tags
      matchedExperts = matchExpertsByTags(experts as Expert[], tags, options)
    }

    const response: MatchExpertsResponse = {
      experts: matchedExperts,
      request_tags: requestTags,
      total_matched: matchedExperts.length,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
