import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SessionList, { Session } from '@/components/SessionList'
import ExpertCard, { Expert } from '@/components/ExpertCard'

/**
 * User dashboard metadata.
 */
export const metadata = {
  title: 'Dashboard | Last20 - Call an Expert',
  description: 'Manage your expert sessions and find help for your AI projects.',
}

/**
 * Dashboard page for authenticated users.
 * Shows their sessions, matched experts, and quick actions.
 * Protected by middleware - redirects to login if not authenticated.
 */
export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/dashboard')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch user's sessions with expert info
  const { data: sessionsData } = await supabase
    .from('sessions')
    .select(
      `
      id,
      scheduled_at,
      started_at,
      ended_at,
      duration_minutes,
      status,
      amount,
      expert:experts!sessions_expert_id_fkey (
        id,
        expertise_tags,
        profile:profiles!experts_id_fkey (
          full_name,
          avatar_url
        )
      ),
      help_request:help_requests (
        id,
        title
      )
    `
    )
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: false })
    .limit(10)

  // Fetch available experts for matching (limit to 6 for dashboard)
  const { data: expertsData } = await supabase
    .from('experts')
    .select(
      `
      id,
      bio,
      expertise_tags,
      hourly_rate,
      available,
      rating,
      total_sessions,
      profile:profiles!experts_id_fkey (
        full_name,
        avatar_url
      )
    `
    )
    .eq('approved', true)
    .eq('available', true)
    .order('rating', { ascending: false })
    .limit(6)

  // Fetch user's pending help requests
  const { data: helpRequestsData } = await supabase
    .from('help_requests')
    .select('id, title, description, status, created_at')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(3)

  // Transform data to match component types
  const sessions: Session[] = (sessionsData || []).map((s) => ({
    id: s.id,
    scheduled_at: s.scheduled_at,
    started_at: s.started_at,
    ended_at: s.ended_at,
    duration_minutes: s.duration_minutes,
    status: s.status as Session['status'],
    amount: s.amount,
    expert: {
      id: (s.expert as { id: string }).id,
      expertise_tags: (s.expert as { expertise_tags: string[] }).expertise_tags,
      profile: {
        full_name: ((s.expert as { profile: { full_name: string | null } }).profile)?.full_name || null,
        avatar_url: ((s.expert as { profile: { avatar_url: string | null } }).profile)?.avatar_url || null,
      },
    },
    help_request: s.help_request
      ? {
          id: (s.help_request as { id: string }).id,
          title: (s.help_request as { title: string }).title,
        }
      : null,
  }))

  const experts: Expert[] = (expertsData || []).map((e) => ({
    id: e.id,
    bio: e.bio,
    expertise_tags: e.expertise_tags,
    hourly_rate: e.hourly_rate,
    available: e.available,
    rating: e.rating,
    total_sessions: e.total_sessions,
    profile: {
      full_name: (e.profile as { full_name: string | null })?.full_name || null,
      avatar_url: (e.profile as { avatar_url: string | null })?.avatar_url || null,
    },
  }))

  const helpRequests = helpRequestsData || []

  // Separate upcoming and past sessions
  const now = new Date()
  const upcomingSessions = sessions.filter(
    (s) =>
      (s.status === 'scheduled' || s.status === 'in_progress') &&
      new Date(s.scheduled_at) >= now
  )
  const pastSessions = sessions.filter(
    (s) =>
      s.status === 'completed' ||
      s.status === 'cancelled' ||
      (s.status === 'scheduled' && new Date(s.scheduled_at) < now)
  )

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Navigation */}
      <header className="border-b border-secondary-200 bg-white">
        <nav className="container-app flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-lg font-bold text-white">L</span>
            </div>
            <span className="text-lg font-semibold text-secondary-900">
              Last20
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/experts"
              className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
            >
              Browse Experts
            </Link>
            {profile?.is_expert ? (
              <Link
                href="/expert/dashboard"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Expert Dashboard
              </Link>
            ) : (
              <Link
                href="/become-expert"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Become an Expert
              </Link>
            )}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-primary-700">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="container-app py-8">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-secondary-900 sm:text-3xl">
            Welcome back, {displayName}!
          </h1>
          <p className="mt-1 text-secondary-600">
            Manage your expert sessions and get help on your projects.
          </p>
        </div>

        {/* Quick stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-secondary-200 bg-white p-4">
            <div className="text-2xl font-bold text-secondary-900">
              {upcomingSessions.length}
            </div>
            <div className="text-sm text-secondary-600">Upcoming Sessions</div>
          </div>
          <div className="rounded-xl border border-secondary-200 bg-white p-4">
            <div className="text-2xl font-bold text-secondary-900">
              {pastSessions.filter((s) => s.status === 'completed').length}
            </div>
            <div className="text-sm text-secondary-600">Completed Sessions</div>
          </div>
          <div className="rounded-xl border border-secondary-200 bg-white p-4">
            <div className="text-2xl font-bold text-secondary-900">
              {helpRequests.length}
            </div>
            <div className="text-sm text-secondary-600">Pending Requests</div>
          </div>
          <div className="rounded-xl border border-secondary-200 bg-white p-4">
            <div className="text-2xl font-bold text-secondary-900">
              {experts.length}
            </div>
            <div className="text-sm text-secondary-600">Experts Available</div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column - Sessions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Pending Help Requests */}
            {helpRequests.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-secondary-900">
                    Pending Help Requests
                  </h2>
                </div>
                <div className="space-y-3">
                  {helpRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-yellow-200 bg-yellow-50 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-secondary-900">
                            {request.title}
                          </h3>
                          <p className="mt-1 text-sm text-secondary-600 line-clamp-1">
                            {request.description}
                          </p>
                        </div>
                        <Link
                          href={`/experts?request=${request.id}`}
                          className="flex-shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                        >
                          Find Expert
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Sessions */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-secondary-900">
                  Upcoming Sessions
                </h2>
                <Link
                  href="/experts"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Book New Session
                </Link>
              </div>
              <SessionList
                sessions={upcomingSessions}
                emptyMessage="No upcoming sessions"
              />
            </section>

            {/* Past Sessions */}
            {pastSessions.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-secondary-900">
                    Past Sessions
                  </h2>
                </div>
                <SessionList sessions={pastSessions.slice(0, 5)} />
              </section>
            )}
          </div>

          {/* Right column - Matched Experts */}
          <div className="space-y-6">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-secondary-900">
                  Available Experts
                </h2>
                <Link
                  href="/experts"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  View All
                </Link>
              </div>
              {experts.length > 0 ? (
                <div className="space-y-4">
                  {experts.slice(0, 3).map((expert) => (
                    <ExpertCard key={expert.id} expert={expert} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-secondary-200 bg-white p-6 text-center">
                  <p className="text-sm text-secondary-600">
                    No experts available at the moment.
                  </p>
                  <p className="mt-1 text-sm text-secondary-500">
                    Check back soon!
                  </p>
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section className="rounded-xl border border-secondary-200 bg-white p-6">
              <h2 className="font-semibold text-secondary-900 mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  href="/experts"
                  className="flex items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-3 hover:bg-secondary-100 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                    <svg
                      className="h-5 w-5 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900">
                      Find an Expert
                    </div>
                    <div className="text-sm text-secondary-500">
                      Browse by expertise
                    </div>
                  </div>
                </Link>

                <a
                  href="chrome://extensions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-3 hover:bg-secondary-100 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                    <svg
                      className="h-5 w-5 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900">
                      Use Extension
                    </div>
                    <div className="text-sm text-secondary-500">
                      Capture issues easily
                    </div>
                  </div>
                </a>

                {!profile?.is_expert && (
                  <Link
                    href="/become-expert"
                    className="flex items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-3 hover:bg-secondary-100 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                      <svg
                        className="h-5 w-5 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-secondary-900">
                        Become an Expert
                      </div>
                      <div className="text-sm text-secondary-500">
                        Earn by helping others
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
