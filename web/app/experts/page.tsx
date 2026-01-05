import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import ExpertCard, { Expert } from '@/components/ExpertCard'

/**
 * Expert listing page metadata.
 */
export const metadata = {
  title: 'Browse Experts | Last20 - Call an Expert',
  description:
    'Find vetted experts to help you with your AI projects. Browse by expertise, rating, and availability.',
}

/**
 * Search params for filtering experts.
 */
interface ExpertsPageProps {
  searchParams: Promise<{
    tag?: string
    q?: string
    available?: string
    request?: string
  }>
}

/**
 * Expert list loading skeleton.
 */
function ExpertListSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-secondary-200 bg-white p-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-secondary-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 rounded bg-secondary-200" />
              <div className="h-4 w-24 rounded bg-secondary-200" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full rounded bg-secondary-200" />
            <div className="h-4 w-3/4 rounded bg-secondary-200" />
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 rounded bg-secondary-200" />
            <div className="h-6 w-20 rounded bg-secondary-200" />
            <div className="h-6 w-14 rounded bg-secondary-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Get unique expertise tags from all approved experts.
 */
async function getExpertiseTags(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('experts')
    .select('expertise_tags')
    .eq('approved', true)

  if (!data) return []

  // Flatten and deduplicate tags
  const allTags = data.flatMap((e) => e.expertise_tags || [])
  const uniqueTags = [...new Set(allTags)]
  return uniqueTags.sort()
}

/**
 * Expert listing page.
 * Shows all approved experts with filtering by expertise tags.
 * Public page - no auth required.
 */
export default async function ExpertsPage({ searchParams }: ExpertsPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Get filter params
  const selectedTag = params.tag
  const searchQuery = params.q
  const showAvailableOnly = params.available === 'true'
  const helpRequestId = params.request

  // Fetch experts with filtering
  let query = supabase
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
    .order('rating', { ascending: false })

  // Apply availability filter
  if (showAvailableOnly) {
    query = query.eq('available', true)
  }

  // Apply tag filter using contains (array overlap)
  if (selectedTag) {
    query = query.contains('expertise_tags', [selectedTag])
  }

  const { data: expertsData } = await query

  // Get all expertise tags for filter dropdown
  const allTags = await getExpertiseTags(supabase)

  // Transform data to match component types
  const experts: Expert[] = (expertsData || [])
    .map((e) => ({
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
    // Apply search query filter (client-side for name search)
    .filter((expert) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      const name = expert.profile.full_name?.toLowerCase() || ''
      const bio = expert.bio?.toLowerCase() || ''
      const tags = expert.expertise_tags.join(' ').toLowerCase()
      return name.includes(query) || bio.includes(query) || tags.includes(query)
    })

  // Get help request info if coming from dashboard
  let helpRequest = null
  if (helpRequestId) {
    const { data } = await supabase
      .from('help_requests')
      .select('id, title, description')
      .eq('id', helpRequestId)
      .single()
    helpRequest = data
  }

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
              Dashboard
            </Link>
            <Link
              href="/become-expert"
              className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
            >
              Become an Expert
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      <main className="container-app py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-secondary-900 sm:text-3xl">
            Browse Experts
          </h1>
          <p className="mt-2 text-secondary-600">
            Find the perfect expert to help you get unstuck on your project.
          </p>
        </div>

        {/* Help request context if present */}
        {helpRequest && (
          <div className="mb-6 rounded-lg border border-primary-200 bg-primary-50 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-primary-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-medium text-primary-900">
                  Finding experts for: {helpRequest.title}
                </h3>
                <p className="mt-1 text-sm text-primary-700 line-clamp-2">
                  {helpRequest.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-secondary-200 bg-white p-4">
          {/* Search */}
          <form className="flex-1 min-w-[200px]" action="/experts" method="GET">
            {selectedTag && (
              <input type="hidden" name="tag" value={selectedTag} />
            )}
            {showAvailableOnly && (
              <input type="hidden" name="available" value="true" />
            )}
            {helpRequestId && (
              <input type="hidden" name="request" value={helpRequestId} />
            )}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-secondary-400"
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
              <input
                type="text"
                name="q"
                placeholder="Search by name, expertise..."
                defaultValue={searchQuery || ''}
                className="w-full rounded-lg border border-secondary-300 bg-white py-2.5 pl-10 pr-4 text-sm text-secondary-900 placeholder-secondary-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </form>

          {/* Tag filter dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                const url = new URL(window.location.href)
                if (e.target.value) {
                  url.searchParams.set('tag', e.target.value)
                } else {
                  url.searchParams.delete('tag')
                }
                window.location.href = url.toString()
              }}
              defaultValue={selectedTag || ''}
              className="appearance-none rounded-lg border border-secondary-300 bg-white py-2.5 pl-4 pr-10 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Expertise</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Availability filter */}
          <Link
            href={
              showAvailableOnly
                ? `/experts${selectedTag ? `?tag=${selectedTag}` : ''}${searchQuery ? `${selectedTag ? '&' : '?'}q=${searchQuery}` : ''}${helpRequestId ? `${selectedTag || searchQuery ? '&' : '?'}request=${helpRequestId}` : ''}`
                : `/experts?available=true${selectedTag ? `&tag=${selectedTag}` : ''}${searchQuery ? `&q=${searchQuery}` : ''}${helpRequestId ? `&request=${helpRequestId}` : ''}`
            }
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              showAvailableOnly
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${showAvailableOnly ? 'bg-green-500' : 'bg-secondary-300'}`}
            />
            Available Now
          </Link>

          {/* Clear filters */}
          {(selectedTag || searchQuery || showAvailableOnly) && (
            <Link
              href={helpRequestId ? `/experts?request=${helpRequestId}` : '/experts'}
              className="text-sm font-medium text-secondary-500 hover:text-secondary-700"
            >
              Clear filters
            </Link>
          )}
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-secondary-600">
          {experts.length} expert{experts.length !== 1 ? 's' : ''} found
          {selectedTag && (
            <span>
              {' '}
              in <span className="font-medium text-secondary-900">{selectedTag}</span>
            </span>
          )}
          {showAvailableOnly && (
            <span className="text-green-600"> • Available now</span>
          )}
        </div>

        {/* Expert grid */}
        <Suspense fallback={<ExpertListSkeleton />}>
          {experts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {experts.map((expert) => (
                <ExpertCard key={expert.id} expert={expert} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-secondary-200 bg-white p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-secondary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-secondary-900">
                No experts found
              </h3>
              <p className="mt-2 text-sm text-secondary-600">
                {selectedTag || searchQuery
                  ? 'Try adjusting your filters to find more experts.'
                  : 'No experts are available at the moment. Check back soon!'}
              </p>
              {(selectedTag || searchQuery || showAvailableOnly) && (
                <Link
                  href="/experts"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear all filters
                </Link>
              )}
            </div>
          )}
        </Suspense>

        {/* Become an expert CTA */}
        <div className="mt-12 rounded-xl border border-secondary-200 bg-gradient-to-r from-primary-50 to-secondary-50 p-8 text-center">
          <h2 className="text-xl font-bold text-secondary-900">
            Are you an expert?
          </h2>
          <p className="mt-2 text-secondary-600">
            Join our community and earn by helping others succeed with their AI projects.
          </p>
          <Link
            href="/become-expert"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            Become an Expert
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  )
}
