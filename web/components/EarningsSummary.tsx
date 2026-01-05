'use client'

import Link from 'next/link'

/**
 * Earnings data structure for display.
 */
export interface EarningsData {
  totalEarnings: number // Total earnings in cents (all time)
  pendingPayout: number // Pending payout in cents (not yet transferred)
  thisMonthEarnings: number // Earnings this month in cents
  lastMonthEarnings: number // Earnings last month in cents
  completedSessions: number // Total completed sessions
  thisMonthSessions: number // Sessions completed this month
  averageRating: number // Average rating from users
  totalReviews: number // Total number of reviews
}

interface EarningsSummaryProps {
  earnings: EarningsData
  stripeConnected: boolean
}

/**
 * Format cents to dollar display.
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Calculate percentage change between two values.
 */
function calculateChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * EarningsSummary component displays expert earnings overview.
 * Shows total earnings, pending payouts, and period comparisons.
 */
export default function EarningsSummary({
  earnings,
  stripeConnected,
}: EarningsSummaryProps) {
  const monthChange = calculateChange(
    earnings.thisMonthEarnings,
    earnings.lastMonthEarnings
  )

  return (
    <div className="space-y-6">
      {/* Main earnings cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Earnings */}
        <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
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
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-secondary-500">
              Total Earnings
            </p>
            <p className="mt-1 text-2xl font-bold text-secondary-900">
              {formatCurrency(earnings.totalEarnings)}
            </p>
          </div>
        </div>

        {/* This Month */}
        <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <svg
                className="h-5 w-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            {monthChange !== null && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  monthChange >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {monthChange >= 0 ? '+' : ''}
                {monthChange}%
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-secondary-500">This Month</p>
            <p className="mt-1 text-2xl font-bold text-secondary-900">
              {formatCurrency(earnings.thisMonthEarnings)}
            </p>
          </div>
        </div>

        {/* Pending Payout */}
        <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
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
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-secondary-500">
              Pending Payout
            </p>
            <p className="mt-1 text-2xl font-bold text-secondary-900">
              {formatCurrency(earnings.pendingPayout)}
            </p>
          </div>
        </div>

        {/* Completed Sessions */}
        <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <svg
                className="h-5 w-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-secondary-500">
              Sessions Completed
            </p>
            <p className="mt-1 text-2xl font-bold text-secondary-900">
              {earnings.completedSessions}
            </p>
            <p className="text-xs text-secondary-400">
              {earnings.thisMonthSessions} this month
            </p>
          </div>
        </div>
      </div>

      {/* Rating and Stripe Connect */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Rating Card */}
        <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-secondary-900">Your Rating</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`h-6 w-6 ${
                      star <= Math.round(earnings.averageRating)
                        ? 'text-yellow-400'
                        : 'text-secondary-200'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xl font-bold text-secondary-900">
                {earnings.averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-sm text-secondary-500">
              from {earnings.totalReviews} reviews
            </span>
          </div>
        </div>

        {/* Stripe Connect Status */}
        <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-secondary-900">Payout Account</h3>
          <div className="mt-4">
            {stripeConnected ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <svg
                    className="h-5 w-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-secondary-900">
                    Stripe Connected
                  </p>
                  <p className="text-sm text-secondary-500">
                    Payouts are automatically processed
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900">
                      Setup Required
                    </p>
                    <p className="text-sm text-secondary-500">
                      Connect Stripe to receive payouts
                    </p>
                  </div>
                </div>
                <Link
                  href="/expert/settings/payout"
                  className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
                >
                  Connect Stripe
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
