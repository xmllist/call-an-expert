/**
 * Expert Matching Algorithm
 *
 * Matches help requests with available experts based on expertise tags.
 * Uses a scoring system that considers tag overlap, expert rating, and availability.
 *
 * Scoring factors:
 * - Tag match score: Number of matching tags / Total request tags (0-1)
 * - Rating bonus: Normalized expert rating (0-1)
 * - Availability: Filter out unavailable experts
 *
 * Final score = (tag_match_weight * tag_score) + (rating_weight * rating_score)
 */

export interface Expert {
  id: string
  bio: string | null
  expertise_tags: string[]
  hourly_rate: number
  session_rate: number
  available: boolean
  rating: number
  total_sessions: number
  total_reviews: number
  stripe_account_id: string | null
  approved: boolean
  created_at: string
  updated_at: string
  profiles?: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface HelpRequest {
  id: string
  user_id: string
  title: string
  description: string
  screenshot_url: string | null
  context: Record<string, unknown>
  status: string
  created_at: string
}

export interface MatchedExpert extends Expert {
  match_score: number
  matching_tags: string[]
}

export interface MatchingOptions {
  minMatchScore?: number
  maxResults?: number
  requireStripeAccount?: boolean
  tagMatchWeight?: number
  ratingWeight?: number
}

const DEFAULT_OPTIONS: Required<MatchingOptions> = {
  minMatchScore: 0.1,
  maxResults: 10,
  requireStripeAccount: false,
  tagMatchWeight: 0.7,
  ratingWeight: 0.3,
}

/**
 * Normalize a string for tag matching
 * - Lowercase
 * - Remove extra whitespace
 * - Remove special characters
 */
function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Extract relevant tags from a help request's title, description, and context
 * Uses keyword extraction based on common tech/AI terms
 */
export function extractTagsFromRequest(request: HelpRequest): string[] {
  const text = `${request.title} ${request.description}`.toLowerCase()

  // Common tech keywords to match against
  const techKeywords = [
    // AI/ML
    'ai', 'machine learning', 'ml', 'deep learning', 'neural network', 'gpt', 'llm',
    'chatgpt', 'claude', 'openai', 'anthropic', 'prompt', 'embedding', 'vector',
    'rag', 'fine-tuning', 'transformer', 'nlp', 'computer vision', 'huggingface',
    // Web Development
    'javascript', 'typescript', 'react', 'next.js', 'nextjs', 'vue', 'angular',
    'svelte', 'node.js', 'nodejs', 'express', 'api', 'rest', 'graphql', 'html',
    'css', 'tailwind', 'sass', 'webpack', 'vite', 'frontend', 'backend', 'fullstack',
    // Programming Languages
    'python', 'java', 'c++', 'c#', 'rust', 'go', 'ruby', 'php', 'swift', 'kotlin',
    // Databases
    'database', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'supabase',
    'firebase', 'prisma', 'orm',
    // Cloud/DevOps
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'ci/cd', 'devops', 'vercel',
    'netlify', 'heroku', 'terraform', 'serverless', 'lambda',
    // Tools
    'cursor', 'replit', 'v0', 'github', 'git', 'vscode', 'copilot', 'windsurf',
    // Mobile
    'ios', 'android', 'react native', 'flutter', 'mobile', 'expo',
    // General
    'debugging', 'testing', 'deployment', 'authentication', 'authorization',
    'security', 'performance', 'optimization', 'architecture', 'design patterns',
  ]

  const extractedTags: string[] = []

  for (const keyword of techKeywords) {
    if (text.includes(keyword)) {
      extractedTags.push(keyword)
    }
  }

  // Also extract from context if available
  if (request.context) {
    const contextStr = JSON.stringify(request.context).toLowerCase()
    for (const keyword of techKeywords) {
      if (contextStr.includes(keyword) && !extractedTags.includes(keyword)) {
        extractedTags.push(keyword)
      }
    }
  }

  return extractedTags
}

/**
 * Calculate tag match score between request tags and expert expertise_tags
 * Returns a score between 0 and 1
 */
function calculateTagMatchScore(
  requestTags: string[],
  expertTags: string[]
): { score: number; matchingTags: string[] } {
  if (requestTags.length === 0) {
    // If no tags extracted from request, match all experts equally
    return { score: 0.5, matchingTags: [] }
  }

  const normalizedRequestTags = requestTags.map(normalizeTag)
  const normalizedExpertTags = expertTags.map(normalizeTag)

  const matchingTags: string[] = []

  for (const requestTag of normalizedRequestTags) {
    for (let i = 0; i < normalizedExpertTags.length; i++) {
      const expertTag = normalizedExpertTags[i]
      // Check for exact match or partial match
      if (
        expertTag === requestTag ||
        expertTag.includes(requestTag) ||
        requestTag.includes(expertTag)
      ) {
        matchingTags.push(expertTags[i]) // Use original tag for display
        break
      }
    }
  }

  const score = matchingTags.length / requestTags.length
  return { score, matchingTags: [...new Set(matchingTags)] }
}

/**
 * Calculate normalized rating score (0-1)
 */
function calculateRatingScore(rating: number): number {
  // Rating is 0-5, normalize to 0-1
  return rating / 5
}

/**
 * Match a help request with available experts
 * Returns a sorted list of matched experts with their match scores
 */
export function matchExperts(
  experts: Expert[],
  request: HelpRequest,
  options: MatchingOptions = {}
): MatchedExpert[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Extract tags from request
  const requestTags = extractTagsFromRequest(request)

  // Filter and score experts
  const matchedExperts: MatchedExpert[] = []

  for (const expert of experts) {
    // Must be approved and available
    if (!expert.approved || !expert.available) {
      continue
    }

    // Optionally require Stripe account for payouts
    if (opts.requireStripeAccount && !expert.stripe_account_id) {
      continue
    }

    // Calculate tag match score
    const { score: tagScore, matchingTags } = calculateTagMatchScore(
      requestTags,
      expert.expertise_tags
    )

    // Calculate rating score
    const ratingScore = calculateRatingScore(expert.rating)

    // Calculate final weighted score
    const matchScore =
      opts.tagMatchWeight * tagScore + opts.ratingWeight * ratingScore

    // Skip if below minimum threshold
    if (matchScore < opts.minMatchScore) {
      continue
    }

    matchedExperts.push({
      ...expert,
      match_score: Math.round(matchScore * 100) / 100, // Round to 2 decimal places
      matching_tags: matchingTags,
    })
  }

  // Sort by match score (descending), then by rating (descending)
  matchedExperts.sort((a, b) => {
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score
    }
    return b.rating - a.rating
  })

  // Limit results
  return matchedExperts.slice(0, opts.maxResults)
}

/**
 * Match experts by specific tags (for direct tag-based search)
 * Returns experts that have at least one matching tag
 */
export function matchExpertsByTags(
  experts: Expert[],
  tags: string[],
  options: MatchingOptions = {}
): MatchedExpert[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const matchedExperts: MatchedExpert[] = []

  for (const expert of experts) {
    // Must be approved and available
    if (!expert.approved || !expert.available) {
      continue
    }

    // Optionally require Stripe account for payouts
    if (opts.requireStripeAccount && !expert.stripe_account_id) {
      continue
    }

    // Calculate tag match
    const { score: tagScore, matchingTags } = calculateTagMatchScore(
      tags,
      expert.expertise_tags
    )

    // Must have at least one matching tag
    if (matchingTags.length === 0) {
      continue
    }

    // Calculate rating score
    const ratingScore = calculateRatingScore(expert.rating)

    // Calculate final weighted score
    const matchScore =
      opts.tagMatchWeight * tagScore + opts.ratingWeight * ratingScore

    // Skip if below minimum threshold
    if (matchScore < opts.minMatchScore) {
      continue
    }

    matchedExperts.push({
      ...expert,
      match_score: Math.round(matchScore * 100) / 100,
      matching_tags: matchingTags,
    })
  }

  // Sort by match score (descending), then by rating (descending)
  matchedExperts.sort((a, b) => {
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score
    }
    return b.rating - a.rating
  })

  return matchedExperts.slice(0, opts.maxResults)
}

/**
 * Get available expertise tags from a list of experts
 * Useful for building tag filter UI
 */
export function getAvailableExpertiseTags(experts: Expert[]): string[] {
  const tagSet = new Set<string>()

  for (const expert of experts) {
    if (expert.approved && expert.available) {
      for (const tag of expert.expertise_tags) {
        tagSet.add(tag)
      }
    }
  }

  return Array.from(tagSet).sort()
}
