import Link from 'next/link'

/**
 * Session data structure for display.
 */
export interface Session {
  id: string
  scheduled_at: string
  started_at: string | null
  ended_at: string | null
  duration_minutes: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'paid'
  amount: number
  expert: {
    id: string
    profile: {
      full_name: string | null
      avatar_url: string | null
    }
    expertise_tags: string[]
  }
  help_request: {
    id: string
    title: string
  } | null
}

interface SessionListProps {
  sessions: Session[]
  emptyMessage?: string
}

/**
 * Status badge component for session status.
 */
function StatusBadge({ status }: { status: Session['status'] }) {
  const statusConfig: Record<
    Session['status'],
    { label: string; className: string }
  > = {
    scheduled: {
      label: 'Scheduled',
      className: 'bg-blue-100 text-blue-700',
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-green-100 text-green-700',
    },
    completed: {
      label: 'Completed',
      className: 'bg-secondary-100 text-secondary-700',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-red-100 text-red-700',
    },
    paid: {
      label: 'Paid',
      className: 'bg-primary-100 text-primary-700',
    },
  }

  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

/**
 * Format a date string for display.
 */
function formatSessionDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Check if it's today
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`
  }

  // Check if it's tomorrow
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`
  }

  // Otherwise show full date
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * SessionList component displays a list of user sessions.
 * Shows session details, expert info, status, and actions.
 */
export default function SessionList({
  sessions,
  emptyMessage = 'No sessions yet',
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-8 text-center">
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
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h3 className="mt-4 text-sm font-medium text-secondary-900">
          {emptyMessage}
        </h3>
        <p className="mt-1 text-sm text-secondary-500">
          Book a session with an expert to get started.
        </p>
        <div className="mt-6">
          <Link
            href="/experts"
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          >
            Browse Experts
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const expertName = session.expert.profile.full_name || 'Expert'
        const isActive =
          session.status === 'scheduled' || session.status === 'in_progress'

        return (
          <div
            key={session.id}
            className={`rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
              isActive ? 'border-primary-200' : 'border-secondary-200'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Expert avatar */}
              <div className="relative h-12 w-12 flex-shrink-0">
                {session.expert.profile.avatar_url ? (
                  <img
                    src={session.expert.profile.avatar_url}
                    alt={expertName}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-lg font-semibold">
                    {expertName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Session info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-secondary-900 truncate">
                    Session with {expertName}
                  </h3>
                  <StatusBadge status={session.status} />
                </div>

                {/* Help request title */}
                {session.help_request && (
                  <p className="mt-1 text-sm text-secondary-600 truncate">
                    {session.help_request.title}
                  </p>
                )}

                {/* Date and duration */}
                <div className="mt-2 flex items-center gap-4 text-sm text-secondary-500">
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {formatSessionDate(session.scheduled_at)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    ${(session.amount / 100).toFixed(0)}
                  </span>
                  <span>{session.duration_minutes} min</span>
                </div>

                {/* Expert tags */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {session.expert.expertise_tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded bg-secondary-100 px-1.5 py-0.5 text-xs text-secondary-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                {session.status === 'in_progress' && (
                  <Link
                    href={`/session/${session.id}`}
                    className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    Join Session
                  </Link>
                )}
                {session.status === 'scheduled' && (
                  <Link
                    href={`/session/${session.id}`}
                    className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                  >
                    View Details
                  </Link>
                )}
                {session.status === 'completed' && (
                  <Link
                    href={`/session/${session.id}`}
                    className="inline-flex items-center rounded-lg border border-secondary-300 bg-white px-4 py-2 text-sm font-semibold text-secondary-700 shadow-sm hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                  >
                    View Summary
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
