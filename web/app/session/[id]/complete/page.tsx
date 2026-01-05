'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import RatingModal from '@/components/session/RatingModal'
import { createClient } from '@/lib/supabase/client'

/**
 * Session Complete Page
 *
 * Displayed after a session ends. Shows session summary and
 * prompts the user/expert to rate their experience.
 */

interface SessionData {
  id: string
  user_id: string
  expert_id: string
  scheduled_at: string
  started_at: string | null
  ended_at: string | null
  duration_minutes: number
  status: string
  amount: number
  help_request: {
    id: string
    title: string
    description: string
  } | null
  expert: {
    id: string
    profile: {
      full_name: string | null
      avatar_url: string | null
    }
  }
  user: {
    full_name: string | null
    avatar_url: string | null
  }
}

interface CurrentUser {
  id: string
  email: string
  full_name: string
}

export default function SessionCompletePage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<SessionData | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [hasRated, setHasRated] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)

        const supabase = createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push(`/login?redirectTo=/session/${sessionId}/complete`)
          return
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        setCurrentUser({
          id: user.id,
          email: user.email || '',
          full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
        })

        // Get session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select(`
            id,
            user_id,
            expert_id,
            scheduled_at,
            started_at,
            ended_at,
            duration_minutes,
            status,
            amount,
            help_request:help_requests (
              id,
              title,
              description
            ),
            expert:experts!sessions_expert_id_fkey (
              id,
              profile:profiles!experts_id_fkey (
                full_name,
                avatar_url
              )
            )
          `)
          .eq('id', sessionId)
          .single()

        if (sessionError) {
          setError('Session not found')
          return
        }

        // Get user profile for the session
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', sessionData.user_id)
          .single()

        // Check authorization
        if (sessionData.user_id !== user.id && sessionData.expert_id !== user.id) {
          setError('You are not authorized to access this session')
          return
        }

        // Transform session data
        const transformedSession: SessionData = {
          id: sessionData.id,
          user_id: sessionData.user_id,
          expert_id: sessionData.expert_id,
          scheduled_at: sessionData.scheduled_at,
          started_at: sessionData.started_at,
          ended_at: sessionData.ended_at,
          duration_minutes: sessionData.duration_minutes,
          status: sessionData.status,
          amount: sessionData.amount,
          help_request: sessionData.help_request as SessionData['help_request'],
          expert: {
            id: (sessionData.expert as { id: string }).id,
            profile: {
              full_name: ((sessionData.expert as { profile: { full_name: string | null } }).profile)?.full_name || null,
              avatar_url: ((sessionData.expert as { profile: { avatar_url: string | null } }).profile)?.avatar_url || null,
            },
          },
          user: {
            full_name: userProfile?.full_name || null,
            avatar_url: userProfile?.avatar_url || null,
          },
        }

        setSession(transformedSession)

        // Check if user has already rated
        const { data: existingRating } = await supabase
          .from('ratings')
          .select('id')
          .eq('session_id', sessionId)
          .eq('rater_id', user.id)
          .maybeSingle()

        if (existingRating) {
          setHasRated(true)
        } else {
          // Show rating modal after a short delay
          setTimeout(() => setShowRatingModal(true), 500)
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [sessionId, router])

  const handleRatingSuccess = () => {
    setHasRated(true)
    setShowRatingModal(false)
  }

  const handleRatingClose = () => {
    setShowRatingModal(false)
  }

  // Calculate actual duration
  const getActualDuration = () => {
    if (!session?.started_at || !session?.ended_at) return null
    const start = new Date(session.started_at)
    const end = new Date(session.ended_at)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.round(diffMs / (1000 * 60))
    return diffMins
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Determine user role
  const userRole = currentUser && session
    ? currentUser.id === session.user_id
      ? 'user'
      : 'expert'
    : 'user'

  // Get other participant info
  const getOtherParticipant = () => {
    if (!session) return null
    if (userRole === 'user') {
      return {
        id: session.expert.id,
        name: session.expert.profile?.full_name || 'Expert',
        avatarUrl: session.expert.profile?.avatar_url,
        isExpert: true,
      }
    } else {
      return {
        id: session.user_id,
        name: session.user?.full_name || 'User',
        avatarUrl: session.user?.avatar_url,
        isExpert: false,
      }
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary-300 border-t-primary-500 mx-auto" />
          <p className="mt-4 text-secondary-600">Loading session...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !session || !currentUser) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <svg
            className="h-16 w-16 text-red-400 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h1 className="mt-4 text-xl font-semibold text-secondary-900">
            {error || 'Session not found'}
          </h1>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const otherParticipant = getOtherParticipant()
  const actualDuration = getActualDuration()

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white border-b border-secondary-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-lg font-bold text-white">L</span>
            </div>
            <span className="font-semibold text-secondary-900">Last20</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Success icon */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-4">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">
            Session Complete!
          </h1>
          <p className="mt-2 text-secondary-600">
            Thanks for using Last20. We hope your session was helpful!
          </p>
        </div>

        {/* Session summary card */}
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50">
            <h2 className="text-lg font-semibold text-secondary-900">Session Summary</h2>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Participant info */}
            <div className="flex items-center gap-4">
              {otherParticipant?.avatarUrl ? (
                <img
                  src={otherParticipant.avatarUrl}
                  alt={otherParticipant.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xl font-semibold">
                  {otherParticipant?.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-secondary-900">{otherParticipant?.name}</p>
                <p className="text-sm text-secondary-500">
                  {otherParticipant?.isExpert ? 'Expert' : 'User'}
                </p>
              </div>
            </div>

            {/* Session details grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-secondary-50 p-4">
                <p className="text-xs text-secondary-500 uppercase tracking-wide mb-1">Date</p>
                <p className="font-medium text-secondary-900">
                  {formatDate(session.scheduled_at)}
                </p>
              </div>
              <div className="rounded-lg bg-secondary-50 p-4">
                <p className="text-xs text-secondary-500 uppercase tracking-wide mb-1">Duration</p>
                <p className="font-medium text-secondary-900">
                  {actualDuration !== null ? `${actualDuration} minutes` : `${session.duration_minutes} minutes`}
                </p>
              </div>
              <div className="rounded-lg bg-secondary-50 p-4">
                <p className="text-xs text-secondary-500 uppercase tracking-wide mb-1">Status</p>
                <p className="font-medium text-green-600 capitalize">{session.status}</p>
              </div>
              <div className="rounded-lg bg-secondary-50 p-4">
                <p className="text-xs text-secondary-500 uppercase tracking-wide mb-1">
                  {userRole === 'user' ? 'Amount Paid' : 'Earnings'}
                </p>
                <p className="font-medium text-secondary-900">
                  ${(session.amount / 100 * (userRole === 'expert' ? 0.9 : 1)).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Help request context */}
            {session.help_request && (
              <div className="rounded-lg border border-secondary-200 p-4">
                <h3 className="font-medium text-secondary-900 mb-1">
                  {session.help_request.title}
                </h3>
                <p className="text-sm text-secondary-600 line-clamp-2">
                  {session.help_request.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rating section */}
        {!hasRated && (
          <div className="bg-primary-50 rounded-2xl border border-primary-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              How was your session?
            </h3>
            <p className="text-secondary-600 mb-4">
              Your feedback helps us improve and helps other users find great {userRole === 'user' ? 'experts' : 'sessions'}.
            </p>
            <button
              onClick={() => setShowRatingModal(true)}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              Rate {otherParticipant?.name}
            </button>
          </div>
        )}

        {hasRated && (
          <div className="bg-green-50 rounded-2xl border border-green-200 p-6 mb-8 text-center">
            <svg
              className="h-8 w-8 text-green-600 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            <p className="font-medium text-green-800">Thanks for your feedback!</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/experts"
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-secondary-300 text-secondary-700 rounded-xl font-medium hover:bg-secondary-50 transition-colors"
          >
            Book Another Session
          </Link>
        </div>
      </main>

      {/* Rating Modal */}
      {otherParticipant && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={handleRatingClose}
          sessionId={sessionId}
          ratee={otherParticipant}
          onSuccess={handleRatingSuccess}
        />
      )}
    </div>
  )
}
