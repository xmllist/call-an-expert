'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Chat from '@/components/session/Chat'
import ScreenShare from '@/components/session/ScreenShare'
import SessionTimer from '@/components/session/SessionTimer'
import { createClient } from '@/lib/supabase/client'
import { endSession as socketEndSession } from '@/lib/socket/client'
import type { Message } from '@/components/session/MessageList'

/**
 * Session Room Page
 *
 * Combines chat, screen sharing, and session timer for real-time
 * collaboration between users and experts.
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

type ViewMode = 'split' | 'chat' | 'video'

export default function SessionRoomPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  // State
  const [session, setSession] = useState<SessionData | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [initialMessages, setInitialMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [isEnding, setIsEnding] = useState(false)
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null)

  // Determine user role
  const userRole = currentUser && session
    ? currentUser.id === session.user_id
      ? 'user'
      : 'expert'
    : 'user'

  // Fetch session and user data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)

        const supabase = createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push(`/login?redirectTo=/session/${sessionId}`)
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

        // Get session details with expert and user info
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

        // Set remote user ID for WebRTC
        const otherUserId = user.id === sessionData.user_id
          ? sessionData.expert_id
          : sessionData.user_id
        setRemoteUserId(otherUserId)

        // Fetch existing messages
        const { data: messages } = await supabase
          .from('messages')
          .select('id, session_id, sender_id, content, created_at')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })

        if (messages) {
          // Get sender profiles
          const senderIds = [...new Set(messages.map(m => m.sender_id))]
          const { data: senderProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', senderIds)

          const profileMap = new Map(senderProfiles?.map(p => [p.id, p.full_name]) || [])

          const transformedMessages: Message[] = messages.map(m => ({
            id: m.id,
            sessionId: m.session_id,
            message: m.content,
            senderId: m.sender_id,
            senderName: profileMap.get(m.sender_id) || 'User',
            timestamp: m.created_at,
          }))

          setInitialMessages(transformedMessages)
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [sessionId, router])

  // Handle session end
  const handleEndSession = useCallback(async () => {
    if (!session || isEnding) return

    if (!confirm('Are you sure you want to end this session?')) {
      return
    }

    try {
      setIsEnding(true)

      // Notify via socket
      socketEndSession(sessionId, 'User ended session')

      // Update session status in database
      const supabase = createClient()
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      // Redirect to rating page or dashboard
      router.push(`/session/${sessionId}/complete`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session')
      setIsEnding(false)
    }
  }, [session, sessionId, isEnding, router])

  // Handle session ended by other participant
  const handleSessionEnded = useCallback((data: { endedBy: string; reason?: string }) => {
    // Show notification and redirect
    alert(`Session ended${data.reason ? `: ${data.reason}` : ''}`)
    router.push(`/session/${sessionId}/complete`)
  }, [sessionId, router])

  // Handle timer warning
  const handleTimerWarning = useCallback(() => {
    // Could show a toast notification here
  }, [])

  // Handle timer end
  const handleTimeUp = useCallback(() => {
    handleEndSession()
  }, [handleEndSession])

  // Handle user joined
  const handleUserJoined = useCallback((data: { userId: string; role: string }) => {
    if (data.userId !== currentUser?.id) {
      setRemoteUserId(data.userId)
    }
  }, [currentUser])

  // Handle user left
  const handleUserLeft = useCallback((data: { userId: string; role: string }) => {
    if (data.userId === remoteUserId) {
      // Other participant left - might want to show a notification
    }
  }, [remoteUserId])

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
          <p className="mt-2 text-secondary-600">
            Please check the session link or try again later.
          </p>
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

  const otherParticipant = userRole === 'user' ? session.expert : { id: session.user_id, profile: session.user }
  const otherParticipantName = otherParticipant.profile?.full_name || (userRole === 'user' ? 'Expert' : 'User')

  return (
    <div className="h-screen flex flex-col bg-secondary-50">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-secondary-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left - Session info */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <span className="text-lg font-bold text-white">L</span>
              </div>
            </Link>

            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  {otherParticipant.profile?.avatar_url ? (
                    <img
                      src={otherParticipant.profile.avatar_url}
                      alt={otherParticipantName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-primary-700">
                      {otherParticipantName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-900">
                    Session with {otherParticipantName}
                  </p>
                  {session.help_request && (
                    <p className="text-xs text-secondary-500 truncate max-w-[200px]">
                      {session.help_request.title}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center - Timer */}
          <SessionTimer
            durationMinutes={session.duration_minutes}
            startedAt={session.started_at}
            onWarning={handleTimerWarning}
            onTimeUp={handleTimeUp}
          />

          {/* Right - Controls */}
          <div className="flex items-center gap-2">
            {/* View mode switcher (mobile) */}
            <div className="flex sm:hidden rounded-lg bg-secondary-100 p-1">
              <button
                onClick={() => setViewMode('chat')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'chat'
                    ? 'bg-white text-secondary-900 shadow-sm'
                    : 'text-secondary-600'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setViewMode('video')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'video'
                    ? 'bg-white text-secondary-900 shadow-sm'
                    : 'text-secondary-600'
                }`}
              >
                Screen
              </button>
            </div>

            {/* End session button */}
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
            >
              {isEnding ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              )}
              <span className="hidden sm:inline">
                {isEnding ? 'Ending...' : 'End Session'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {/* Screen Share - full height on desktop, conditional on mobile */}
          <div
            className={`${
              viewMode === 'chat' ? 'hidden' : ''
            } lg:block h-full min-h-0`}
          >
            <ScreenShare
              sessionId={sessionId}
              currentUserId={currentUser.id}
              userRole={userRole}
              remoteUserId={remoteUserId}
            />
          </div>

          {/* Chat - full height on desktop, conditional on mobile */}
          <div
            className={`${
              viewMode === 'video' ? 'hidden' : ''
            } lg:block h-full min-h-0`}
          >
            <Chat
              sessionId={sessionId}
              currentUserId={currentUser.id}
              currentUserName={currentUser.full_name}
              userRole={userRole}
              initialMessages={initialMessages}
              onSessionEnded={handleSessionEnded}
              onUserJoined={handleUserJoined}
              onUserLeft={handleUserLeft}
            />
          </div>
        </div>
      </main>

      {/* Help request context panel (collapsible) */}
      {session.help_request && (
        <div className="flex-shrink-0 border-t border-secondary-200 bg-white">
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-secondary-50">
              <span className="text-sm font-medium text-secondary-700">
                Session Context
              </span>
              <svg
                className="h-4 w-4 text-secondary-400 group-open:rotate-180 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="px-4 py-3 bg-secondary-50 border-t border-secondary-200">
              <h3 className="font-medium text-secondary-900">
                {session.help_request.title}
              </h3>
              <p className="mt-1 text-sm text-secondary-600 whitespace-pre-wrap">
                {session.help_request.description}
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
