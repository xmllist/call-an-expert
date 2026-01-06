/**
 * API Client for Last20 Chrome Extension
 *
 * Provides typed methods for communicating with the web app backend API.
 * Used by the background service worker for all API operations.
 */

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ============================================================================
// Types - Request/Response Interfaces
// ============================================================================

/**
 * Auth tokens stored in chrome.storage
 */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  status: number
}

/**
 * Help request creation payload
 */
export interface HelpRequestPayload {
  title: string
  description: string
  screenshot_url?: string | null
  context?: {
    url: string
    page_title: string
    captured_at: string
    tool_detected?: string
    errors?: string[]
  } | null
}

/**
 * Help request response from API
 */
export interface HelpRequest {
  id: string
  user_id: string
  title: string
  description: string
  screenshot_url: string | null
  context: Record<string, unknown>
  status: string
  created_at: string
  updated_at?: string
}

/**
 * User profile from API
 */
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_expert: boolean
  created_at: string
}

/**
 * Expert profile from API
 */
export interface ExpertProfile {
  id: string
  bio: string | null
  expertise_tags: string[]
  hourly_rate: number
  available: boolean
  rating: number
  total_sessions: number
  approved: boolean
  created_at: string
  profile?: UserProfile
}

/**
 * Matched expert with score
 */
export interface MatchedExpert extends ExpertProfile {
  match_score: number
  matching_tags: string[]
}

/**
 * Session details
 */
export interface Session {
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
  created_at: string
}

// ============================================================================
// Storage Utilities
// ============================================================================

const STORAGE_KEYS = {
  AUTH_TOKENS: 'auth_tokens',
  USER_ID: 'user_id',
} as const

/**
 * Get stored authentication tokens from chrome.storage.local
 */
export async function getAuthTokens(): Promise<AuthTokens | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKENS)
    return result[STORAGE_KEYS.AUTH_TOKENS] || null
  } catch {
    return null
  }
}

/**
 * Store authentication tokens in chrome.storage.local
 */
export async function setAuthTokens(tokens: AuthTokens): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKENS]: tokens })
}

/**
 * Clear stored authentication tokens
 */
export async function clearAuthTokens(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEYS.AUTH_TOKENS, STORAGE_KEYS.USER_ID])
}

/**
 * Check if the current auth tokens are valid (not expired)
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getAuthTokens()
  if (!tokens) return false

  // Check if token is expired (with 5 minute buffer)
  const now = Date.now()
  const bufferMs = 5 * 60 * 1000
  return tokens.expiresAt > now + bufferMs
}

// ============================================================================
// Core API Client
// ============================================================================

/**
 * Make an API request to the backend
 * Automatically includes auth headers if tokens are available
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const tokens = await getAuthTokens()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const status = response.status

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        error: errorData.message || errorData.error || `Request failed with status ${status}`,
        status,
      }
    }

    // Handle empty responses (204 No Content)
    if (status === 204) {
      return { data: undefined as T, status }
    }

    const data = await response.json()
    return { data, status }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error occurred'
    return { error: errorMessage, status: 0 }
  }
}

// ============================================================================
// Help Request API
// ============================================================================

/**
 * Create a new help request
 */
export async function createHelpRequest(payload: HelpRequestPayload): Promise<ApiResponse<HelpRequest>> {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return {
      error: 'Please log in to submit a help request. Visit the dashboard to sign in.',
      status: 401,
    }
  }

  return apiRequest<HelpRequest>('/api/help-request', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Get user's help requests
 */
export async function getHelpRequests(params?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<ApiResponse<HelpRequest[]>> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const queryString = searchParams.toString()
  const endpoint = queryString ? `/api/help-request?${queryString}` : '/api/help-request'

  return apiRequest<HelpRequest[]>(endpoint, { method: 'GET' })
}

/**
 * Get a specific help request by ID
 */
export async function getHelpRequest(id: string): Promise<ApiResponse<HelpRequest>> {
  return apiRequest<HelpRequest>(`/api/help-request/${id}`, { method: 'GET' })
}

// ============================================================================
// Expert Matching API
// ============================================================================

/**
 * Get matched experts for a help request
 */
export async function getMatchedExperts(helpRequestId: string): Promise<ApiResponse<MatchedExpert[]>> {
  return apiRequest<MatchedExpert[]>(`/api/match-experts?help_request_id=${helpRequestId}`, {
    method: 'GET',
  })
}

/**
 * Get matched experts by expertise tags
 */
export async function getExpertsByTags(tags: string[]): Promise<ApiResponse<MatchedExpert[]>> {
  return apiRequest<MatchedExpert[]>(`/api/match-experts?tags=${tags.join(',')}`, {
    method: 'GET',
  })
}

/**
 * Get list of available experts
 */
export async function getExperts(params?: {
  available?: boolean
  tags?: string[]
  limit?: number
  offset?: number
}): Promise<ApiResponse<ExpertProfile[]>> {
  const searchParams = new URLSearchParams()
  if (params?.available !== undefined) searchParams.set('available', params.available.toString())
  if (params?.tags?.length) searchParams.set('tags', params.tags.join(','))
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const queryString = searchParams.toString()
  const endpoint = queryString ? `/api/expert?${queryString}` : '/api/expert'

  return apiRequest<ExpertProfile[]>(endpoint, { method: 'GET' })
}

/**
 * Get a specific expert profile by ID
 */
export async function getExpertProfile(id: string): Promise<ApiResponse<ExpertProfile>> {
  return apiRequest<ExpertProfile>(`/api/expert/${id}`, { method: 'GET' })
}

// ============================================================================
// User Profile API
// ============================================================================

/**
 * Get the current user's profile
 */
export async function getUserProfile(): Promise<ApiResponse<UserProfile>> {
  return apiRequest<UserProfile>('/api/user/profile', { method: 'GET' })
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
  return apiRequest<UserProfile>('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

// ============================================================================
// Session API
// ============================================================================

/**
 * Get user's sessions
 */
export async function getSessions(params?: {
  role?: 'user' | 'expert'
  status?: string
  upcoming?: boolean
  limit?: number
  offset?: number
}): Promise<ApiResponse<Session[]>> {
  const searchParams = new URLSearchParams()
  if (params?.role) searchParams.set('role', params.role)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.upcoming !== undefined) searchParams.set('upcoming', params.upcoming.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const queryString = searchParams.toString()
  const endpoint = queryString ? `/api/session?${queryString}` : '/api/session'

  return apiRequest<Session[]>(endpoint, { method: 'GET' })
}

/**
 * Get a specific session by ID
 */
export async function getSession(id: string): Promise<ApiResponse<Session>> {
  return apiRequest<Session>(`/api/session/${id}`, { method: 'GET' })
}

/**
 * Create a new session (book an expert)
 */
export async function createSession(params: {
  expert_id: string
  scheduled_at: string
  help_request_id?: string
}): Promise<ApiResponse<Session>> {
  return apiRequest<Session>('/api/session', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * Update a session (e.g., start, complete, cancel)
 */
export async function updateSession(
  id: string,
  updates: { action: 'start' | 'complete' | 'cancel' | 'no_show' }
): Promise<ApiResponse<Session>> {
  return apiRequest<Session>(`/api/session/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

// ============================================================================
// Rating API
// ============================================================================

/**
 * Submit a rating for a session
 */
export async function submitRating(params: {
  session_id: string
  ratee_id: string
  score: number
  comment?: string
}): Promise<ApiResponse<{ id: string }>> {
  return apiRequest<{ id: string }>('/api/rating', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * Get ratings for a user or session
 */
export async function getRatings(params?: {
  user_id?: string
  session_id?: string
  type?: 'given' | 'received' | 'all'
}): Promise<ApiResponse<Array<{ id: string; score: number; comment?: string }>>> {
  const searchParams = new URLSearchParams()
  if (params?.user_id) searchParams.set('user_id', params.user_id)
  if (params?.session_id) searchParams.set('session_id', params.session_id)
  if (params?.type) searchParams.set('type', params.type)

  const queryString = searchParams.toString()
  const endpoint = queryString ? `/api/rating?${queryString}` : '/api/rating'

  return apiRequest(endpoint, { method: 'GET' })
}

// ============================================================================
// Subscription API
// ============================================================================

/**
 * Get user's subscription status
 */
export async function getSubscription(): Promise<ApiResponse<{
  id: string
  plan: string
  status: string
  sessions_remaining: number | null
}>> {
  return apiRequest('/api/subscription', { method: 'GET' })
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the API base URL (useful for redirecting to dashboard)
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL
}

/**
 * Build a dashboard URL path
 */
export function getDashboardUrl(path = ''): string {
  return `${API_BASE_URL}/dashboard${path}`
}

/**
 * Build a login URL with redirect
 */
export function getLoginUrl(redirectTo?: string): string {
  const base = `${API_BASE_URL}/login`
  if (redirectTo) {
    return `${base}?redirectTo=${encodeURIComponent(redirectTo)}`
  }
  return base
}

/**
 * Build an expert profile URL
 */
export function getExpertUrl(expertId: string): string {
  return `${API_BASE_URL}/experts/${expertId}`
}

/**
 * Build a session URL
 */
export function getSessionUrl(sessionId: string): string {
  return `${API_BASE_URL}/session/${sessionId}`
}
