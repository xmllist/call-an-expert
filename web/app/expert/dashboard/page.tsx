import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SessionList, { Session } from '@/components/SessionList'
import EarningsSummary, { EarningsData } from '@/components/EarningsSummary'
import AvailabilityToggle from '@/components/AvailabilityToggle'

/**
 * Expert dashboard metadata.
 */
export const metadata = {
  title: 'Expert Dashboard | Last20 - Call an Expert',
  description:
    'Manage your expert sessions, view earnings, and control your availability.',
}

/**
 * Expert Dashboard page for approved experts.
 * Shows session queue, earnings summary, and availability controls.
 * Protected by middleware - redirects to login if not authenticated,
 * redirects to become-expert if not an approved expert.
 */
export default async function ExpertDashboardPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/expert/dashboard')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch expert profile - must be approved
  const { data: expert } = await supabase
    .from('experts')
    .select('*')
    .eq('id', user.id)
    .single()

  // Redirect if not an approved expert
  if (!expert || !expert.approved) {
    redirect('/become-expert')
  }

  // Fetch expert's sessions with user info
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
      expert_payout,
      user:profiles!sessions_user_id_fkey (
        id,
        full_name,
        avatar_url
      ),
      help_request:help_requests (
        id,
        title
      )
    `
    )
    .eq('expert_id', user.id)
    .order('scheduled_at', { ascending: false })
    .limit(20)

  // Get earnings data
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  // Fetch this month's completed sessions for earnings
  const { data: thisMonthSessionsData } = await supabase
    .from('sessions')
    .select('expert_payout')
    .eq('expert_id', user.id)
    .eq('status', 'completed')
    .gte('ended_at', startOfMonth.toISOString())

  // Fetch last month's completed sessions for comparison
  const { data: lastMonthSessionsData } = await supabase
    .from('sessions')
    .select('expert_payout')
    .eq('expert_id', user.id)
    .eq('status', 'completed')
    .gte('ended_at', startOfLastMonth.toISOString())
    .lte('ended_at', endOfLastMonth.toISOString())

  // Fetch all completed sessions for total earnings
  const { data: allCompletedSessionsData } = await supabase
    .from('sessions')
    .select('expert_payout, status')
    .eq('expert_id', user.id)
    .eq('status', 'completed')

  // Fetch pending payouts (paid but not yet transferred)
  const { data: pendingPayoutsData } = await supabase
    .from('sessions')
    .select('expert_payout')
    .eq('expert_id', user.id)
    .eq('status', 'paid')

  // Calculate earnings
  const thisMonthEarnings = (thisMonthSessionsData || []).reduce(
    (sum, s) => sum + (s.expert_payout || 0),
    0
  )
  const lastMonthEarnings = (lastMonthSessionsData || []).reduce(
    (sum, s) => sum + (s.expert_payout || 0),
    0
  )
  const totalEarnings = (allCompletedSessionsData || []).reduce(
    (sum, s) => sum + (s.expert_payout || 0),
    0
  )
  const pendingPayout = (pendingPayoutsData || []).reduce(
    (sum, s) => sum + (s.expert_payout || 0),
    0
  )

  const earnings: EarningsData = {
    totalEarnings,
    pendingPayout,
    thisMonthEarnings,
    lastMonthEarnings,
    completedSessions: expert.total_sessions || 0,
    thisMonthSessions: (thisMonthSessionsData || []).length,
    averageRating: expert.rating || 0,
    totalReviews: expert.total_reviews || 0,
  }

  // Transform sessions for display (expert sees user info instead of expert info)
  const sessions: Session[] = (sessionsData || []).map((s) => ({
    id: s.id,
    scheduled_at: s.scheduled_at,
    started_at: s.started_at,
    ended_at: s.ended_at,
    duration_minutes: s.duration_minutes,
    status: s.status as Session['status'],
    amount: s.amount,
    // For expert dashboard, we show the user's info in the expert slot
    expert: {
      id: (s.user as { id: string }).id,
      expertise_tags: [], // Users don't have expertise tags
      profile: {
        full_name:
          (s.user as { full_name: string | null })?.full_name || 'User',
        avatar_url: (s.user as { avatar_url: string | null })?.avatar_url,
      },
    },
    help_request: s.help_request
      ? {
          id: (s.help_request as { id: string }).id,
          title: (s.help_request as { title: string }).title,
        }
      : null,
  }))

  // Separate upcoming and past sessions
  const upcomingSessions = sessions.filter(
    (s) =>
      (s.status === 'scheduled' ||
        s.status === 'paid' ||
        s.status === 'active') &&
      new Date(s.scheduled_at) >= now
  )
  const pastSessions = sessions.filter(
    (s) =>
      s.status === 'completed' ||
      s.status === 'cancelled' ||
      (s.status === 'scheduled' && new Date(s.scheduled_at) < now)
  )

  // Pending sessions (waiting for user payment or action)
  const pendingSessions = sessions.filter(
    (s) => s.status === 'pending_payment' || s.status === 'scheduled'
  )

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Expert'

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
              href="/dashboard"
              className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
            >
              User Dashboard
            </Link>
            <Link
              href="/experts"
              className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
            >
              Browse Experts
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-primary-700">
                  Expert
                </span>
              </div>
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
            Expert Dashboard
          </h1>
          <p className="mt-1 text-secondary-600">
            Welcome back, {displayName}! Manage your sessions and track your
            earnings.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column - Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Earnings Summary */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-secondary-900">
                Earnings Overview
              </h2>
              <EarningsSummary
                earnings={earnings}
                stripeConnected={!!expert.stripe_account_id}
              />
            </section>

            {/* Session Queue */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-secondary-900">
                  Upcoming Sessions
                </h2>
                <span className="text-sm text-secondary-500">
                  {upcomingSessions.length} scheduled
                </span>
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

          {/* Right column - Sidebar */}
          <div className="space-y-6">
            {/* Availability Toggle */}
            <AvailabilityToggle
              expertId={expert.id}
              initialAvailable={expert.available}
            />

            {/* Quick Stats */}
            <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">
                Your Profile
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Rate</span>
                  <span className="font-medium text-secondary-900">
                    ${(expert.session_rate / 100).toFixed(0)}/session
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Expertise</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                    {expert.expertise_tags.slice(0, 2).map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded bg-secondary-100 px-1.5 py-0.5 text-xs text-secondary-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {expert.expertise_tags.length > 2 && (
                      <span className="text-xs text-secondary-400">
                        +{expert.expertise_tags.length - 2}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Status</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      expert.approved
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {expert.approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                <Link
                  href="/expert/settings"
                  className="block w-full rounded-lg border border-secondary-300 bg-white px-4 py-2 text-center text-sm font-semibold text-secondary-700 hover:bg-secondary-50 transition-colors"
                >
                  Edit Profile
                </Link>
              </div>
            </div>

            {/* Pending Queue Notice */}
            {pendingSessions.length > 0 && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                    <svg
                      className="h-5 w-5 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-800">
                      Pending Sessions
                    </h4>
                    <p className="mt-1 text-sm text-yellow-700">
                      You have {pendingSessions.length} session
                      {pendingSessions.length > 1 ? 's' : ''} awaiting user
                      payment or confirmation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-secondary-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href={`/experts/${expert.id}`}
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900">
                      View Public Profile
                    </div>
                    <div className="text-sm text-secondary-500">
                      See what users see
                    </div>
                  </div>
                </Link>

                <Link
                  href="/expert/settings/payout"
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
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900">
                      Payout Settings
                    </div>
                    <div className="text-sm text-secondary-500">
                      Manage Stripe connection
                    </div>
                  </div>
                </Link>

                <Link
                  href="/expert/settings"
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
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900">
                      Expert Settings
                    </div>
                    <div className="text-sm text-secondary-500">
                      Update rate & expertise
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
