import Link from 'next/link'

/**
 * Expert data for display in the card.
 */
export interface Expert {
  id: string
  bio: string | null
  expertise_tags: string[]
  hourly_rate: number
  available: boolean
  rating: number
  total_sessions: number
  profile: {
    full_name: string | null
    avatar_url: string | null
  }
}

interface ExpertCardProps {
  expert: Expert
  onBook?: (expertId: string) => void
}

/**
 * ExpertCard component displays an expert's profile summary with
 * their expertise, rating, rate, and availability status.
 * Used on the dashboard to show matched experts.
 */
export default function ExpertCard({ expert, onBook }: ExpertCardProps) {
  const displayName = expert.profile.full_name || 'Expert'
  const rateDisplay = `$${(expert.hourly_rate / 100).toFixed(0)}`

  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Expert header */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative h-14 w-14 flex-shrink-0">
          {expert.profile.avatar_url ? (
            <img
              src={expert.profile.avatar_url}
              alt={displayName}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xl font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Availability indicator */}
          {expert.available && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500 border-2 border-white" />
            </span>
          )}
        </div>

        {/* Name and rating */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-secondary-900 truncate">
            {displayName}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {/* Rating stars */}
            <div className="flex items-center gap-1">
              <svg
                className="h-4 w-4 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium text-secondary-700">
                {expert.rating.toFixed(1)}
              </span>
            </div>
            <span className="text-secondary-300">•</span>
            <span className="text-sm text-secondary-500">
              {expert.total_sessions} sessions
            </span>
          </div>
        </div>

        {/* Rate badge */}
        <div className="flex-shrink-0">
          <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
            {rateDisplay}/15min
          </span>
        </div>
      </div>

      {/* Bio */}
      {expert.bio && (
        <p className="mt-4 text-sm text-secondary-600 line-clamp-2">
          {expert.bio}
        </p>
      )}

      {/* Expertise tags */}
      <div className="mt-4 flex flex-wrap gap-2">
        {expert.expertise_tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-md bg-secondary-100 px-2 py-1 text-xs font-medium text-secondary-700"
          >
            {tag}
          </span>
        ))}
        {expert.expertise_tags.length > 4 && (
          <span className="inline-flex items-center rounded-md bg-secondary-100 px-2 py-1 text-xs font-medium text-secondary-500">
            +{expert.expertise_tags.length - 4} more
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-3">
        {expert.available ? (
          <>
            {onBook ? (
              <button
                onClick={() => onBook(expert.id)}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Book Session
              </button>
            ) : (
              <Link
                href={`/experts/${expert.id}?book=true`}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors text-center"
              >
                Book Session
              </Link>
            )}
            <Link
              href={`/experts/${expert.id}`}
              className="rounded-lg border border-secondary-300 bg-white px-4 py-2.5 text-sm font-semibold text-secondary-700 shadow-sm hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              View Profile
            </Link>
          </>
        ) : (
          <>
            <div className="flex-1 rounded-lg bg-secondary-100 px-4 py-2.5 text-sm font-medium text-secondary-500 text-center">
              Currently Unavailable
            </div>
            <Link
              href={`/experts/${expert.id}`}
              className="rounded-lg border border-secondary-300 bg-white px-4 py-2.5 text-sm font-semibold text-secondary-700 shadow-sm hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              View Profile
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
