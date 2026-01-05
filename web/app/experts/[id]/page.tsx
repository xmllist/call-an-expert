import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Page props with expert ID and search params.
 */
interface ExpertProfilePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ book?: string }>
}

/**
 * Generate metadata for the expert profile page.
 */
export async function generateMetadata({ params }: ExpertProfilePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: expert } = await supabase
    .from('experts')
    .select(
      `
      id,
      bio,
      expertise_tags,
      profile:profiles!experts_id_fkey (
        full_name
      )
    `
    )
    .eq('id', id)
    .eq('approved', true)
    .single()

  if (!expert) {
    return {
      title: 'Expert Not Found | Last20',
    }
  }

  const displayName =
    (expert.profile as { full_name: string | null })?.full_name || 'Expert'
  const tags = expert.expertise_tags?.slice(0, 3).join(', ') || ''

  return {
    title: `${displayName} - Expert Profile | Last20`,
    description: expert.bio || `${displayName} is an expert in ${tags}. Book a 15-minute session to get help with your AI project.`,
  }
}

/**
 * Expert profile page showing full details and booking options.
 */
export default async function ExpertProfilePage({
  params,
  searchParams,
}: ExpertProfilePageProps) {
  const { id } = await params
  const { book } = await searchParams
  const supabase = await createClient()

  // Fetch expert details
  const { data: expert } = await supabase
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
      created_at,
      profile:profiles!experts_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq('id', id)
    .eq('approved', true)
    .single()

  if (!expert) {
    notFound()
  }

  // Fetch recent ratings for this expert
  const { data: ratings } = await supabase
    .from('ratings')
    .select(
      `
      id,
      score,
      comment,
      created_at,
      rater:profiles!ratings_rater_id_fkey (
        full_name,
        avatar_url
      )
    `
    )
    .eq('ratee_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get current user (for booking)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = expert.profile as { id: string; full_name: string | null; avatar_url: string | null }
  const displayName = profile?.full_name || 'Expert'
  const rateDisplay = `$${(expert.hourly_rate / 100).toFixed(0)}`
  const memberSince = new Date(expert.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Navigation */}
      <header className="border-b border-secondary-200 bg-white">
        <nav className="container-app flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <span className="text-lg font-bold text-white">L</span>
              </div>
              <span className="text-lg font-semibold text-secondary-900">
                Last20
              </span>
            </Link>
            <span className="text-secondary-300">/</span>
            <Link
              href="/experts"
              className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
            >
              Experts
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href={`/login?redirectTo=/experts/${id}`}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="container-app py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column - Profile details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile header card */}
            <div className="rounded-xl border border-secondary-200 bg-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-3xl font-semibold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Availability indicator */}
                  {expert.available && (
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-6 w-6 rounded-full bg-green-500 border-2 border-white" />
                    </span>
                  )}
                </div>

                {/* Name and stats */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-secondary-900">
                        {displayName}
                      </h1>
                      <div className="mt-1 flex items-center gap-3 text-sm text-secondary-600">
                        <div className="flex items-center gap-1">
                          <svg
                            className="h-5 w-5 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-medium text-secondary-900">
                            {expert.rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-secondary-300">•</span>
                        <span>{expert.total_sessions} sessions completed</span>
                        <span className="text-secondary-300">•</span>
                        <span>Member since {memberSince}</span>
                      </div>
                    </div>

                    {/* Rate badge */}
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center rounded-full bg-primary-50 px-4 py-2 text-lg font-semibold text-primary-700">
                        {rateDisplay}
                        <span className="ml-1 text-sm font-normal text-primary-600">
                          /15min
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Availability status */}
                  <div className="mt-4">
                    {expert.available ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Available for sessions
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-secondary-100 px-3 py-1 text-sm font-medium text-secondary-600">
                        <span className="h-2 w-2 rounded-full bg-secondary-400" />
                        Currently unavailable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            {expert.bio && (
              <div className="rounded-xl border border-secondary-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                  About
                </h2>
                <p className="text-secondary-600 whitespace-pre-line">
                  {expert.bio}
                </p>
              </div>
            )}

            {/* Expertise */}
            <div className="rounded-xl border border-secondary-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                Expertise
              </h2>
              <div className="flex flex-wrap gap-2">
                {expert.expertise_tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/experts?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center rounded-full bg-secondary-100 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-200 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="rounded-xl border border-secondary-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-secondary-900">
                  Reviews
                </h2>
                {ratings && ratings.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`h-5 w-5 ${i < Math.round(expert.rating) ? 'text-yellow-400' : 'text-secondary-200'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm text-secondary-600">
                      ({expert.total_sessions} reviews)
                    </span>
                  </div>
                )}
              </div>

              {ratings && ratings.length > 0 ? (
                <div className="space-y-4">
                  {ratings.map((rating) => {
                    const rater = rating.rater as { full_name: string | null; avatar_url: string | null }
                    const raterName = rater?.full_name || 'Anonymous'
                    return (
                      <div key={rating.id} className="border-b border-secondary-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          {/* Reviewer avatar */}
                          {rater?.avatar_url ? (
                            <img
                              src={rater.avatar_url}
                              alt={raterName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-100 text-secondary-600 text-sm font-medium">
                              {raterName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-secondary-900">
                                {raterName}
                              </span>
                              <span className="text-sm text-secondary-500">
                                {new Date(rating.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg
                                  key={i}
                                  className={`h-4 w-4 ${i < rating.score ? 'text-yellow-400' : 'text-secondary-200'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            {rating.comment && (
                              <p className="mt-2 text-sm text-secondary-600">
                                {rating.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-secondary-500">
                  No reviews yet. Be the first to book a session!
                </p>
              )}
            </div>
          </div>

          {/* Right column - Booking card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                Book a Session
              </h2>

              {/* Session details */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-600">Session duration</span>
                  <span className="font-medium text-secondary-900">15 minutes</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-600">Session type</span>
                  <span className="font-medium text-secondary-900">Screen share + Chat</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-600">Response time</span>
                  <span className="font-medium text-secondary-900">Usually within 5 min</span>
                </div>
                <hr className="border-secondary-200" />
                <div className="flex items-center justify-between">
                  <span className="font-medium text-secondary-900">Total price</span>
                  <span className="text-xl font-bold text-secondary-900">
                    {rateDisplay}
                  </span>
                </div>
              </div>

              {/* Book button */}
              {expert.available ? (
                user ? (
                  <Link
                    href={`/book/${expert.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Book Now
                  </Link>
                ) : (
                  <Link
                    href={`/login?redirectTo=/experts/${expert.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                  >
                    Sign in to Book
                  </Link>
                )
              ) : (
                <button
                  disabled
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary-100 px-4 py-3 text-sm font-semibold text-secondary-500 cursor-not-allowed"
                >
                  Currently Unavailable
                </button>
              )}

              {/* Contact option */}
              {expert.available && (
                <p className="mt-4 text-center text-sm text-secondary-500">
                  Have questions?{' '}
                  <Link
                    href="/contact"
                    className="font-medium text-primary-600 hover:text-primary-700"
                  >
                    Contact support
                  </Link>
                </p>
              )}

              {/* Trust indicators */}
              <div className="mt-6 pt-6 border-t border-secondary-200 space-y-3">
                <div className="flex items-center gap-3 text-sm text-secondary-600">
                  <svg
                    className="h-5 w-5 text-green-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span>Vetted and verified expert</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-secondary-600">
                  <svg
                    className="h-5 w-5 text-green-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>Secure payment via Stripe</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-secondary-600">
                  <svg
                    className="h-5 w-5 text-green-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <span>Money-back guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to experts link */}
        <div className="mt-8 pt-8 border-t border-secondary-200">
          <Link
            href="/experts"
            className="inline-flex items-center gap-2 text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to all experts
          </Link>
        </div>
      </main>
    </div>
  )
}
