'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

/**
 * Payment status types
 */
export type PaymentStatusType =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'requires_action'

/**
 * Props for the PaymentStatus component
 */
interface PaymentStatusProps {
  /** Current payment status */
  status: PaymentStatusType
  /** Payment amount in cents */
  amount?: number
  /** Session ID for navigation */
  sessionId?: string
  /** Expert name for display */
  expertName?: string
  /** Scheduled session time */
  scheduledAt?: string
  /** Callback when user clicks primary action */
  onAction?: () => void
  /** Custom message to display */
  message?: string
  /** Whether to show session details */
  showDetails?: boolean
}

/**
 * Status configuration for each payment state
 */
const STATUS_CONFIG: Record<
  PaymentStatusType,
  {
    title: string
    description: string
    icon: 'success' | 'warning' | 'error' | 'info'
    color: string
    bgColor: string
    actionLabel?: string
    actionVariant: 'primary' | 'secondary'
  }
> = {
  pending: {
    title: 'Payment Pending',
    description: 'Your payment is being initialized. Please wait...',
    icon: 'info',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    actionLabel: 'Continue to Payment',
    actionVariant: 'primary',
  },
  processing: {
    title: 'Processing Payment',
    description: 'Your payment is being processed. This may take a moment.',
    icon: 'info',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    actionVariant: 'secondary',
  },
  succeeded: {
    title: 'Payment Successful',
    description: 'Your session has been booked! The expert will be notified.',
    icon: 'success',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    actionLabel: 'Go to Session',
    actionVariant: 'primary',
  },
  failed: {
    title: 'Payment Failed',
    description: 'We were unable to process your payment. Please try again.',
    icon: 'error',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    actionLabel: 'Try Again',
    actionVariant: 'primary',
  },
  cancelled: {
    title: 'Payment Cancelled',
    description: 'Your payment has been cancelled. No charges were made.',
    icon: 'warning',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    actionLabel: 'Find Experts',
    actionVariant: 'secondary',
  },
  refunded: {
    title: 'Payment Refunded',
    description: 'Your payment has been refunded. The amount will be returned to your original payment method.',
    icon: 'info',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    actionLabel: 'View Dashboard',
    actionVariant: 'secondary',
  },
  requires_action: {
    title: 'Action Required',
    description: 'Additional authentication is required to complete your payment.',
    icon: 'warning',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    actionLabel: 'Complete Payment',
    actionVariant: 'primary',
  },
}

/**
 * Icon components for each status type
 */
const StatusIcons = {
  success: (
    <svg
      className="h-8 w-8"
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
  ),
  warning: (
    <svg
      className="h-8 w-8"
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
  ),
  error: (
    <svg
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  info: (
    <svg
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
}

/**
 * Format currency from cents
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * PaymentStatus Component
 *
 * Displays the current status of a payment with appropriate styling and actions.
 * Supports various states: pending, processing, succeeded, failed, cancelled, refunded.
 *
 * Features:
 * - Visual status indicators with icons
 * - Session details display
 * - Contextual action buttons
 * - Animated processing state
 *
 * Usage:
 * ```tsx
 * <PaymentStatus
 *   status="succeeded"
 *   amount={1500}
 *   sessionId="session-123"
 *   expertName="John Doe"
 *   scheduledAt="2025-01-15T10:00:00Z"
 * />
 * ```
 */
export default function PaymentStatus({
  status,
  amount,
  sessionId,
  expertName,
  scheduledAt,
  onAction,
  message,
  showDetails = true,
}: PaymentStatusProps) {
  const config = STATUS_CONFIG[status]

  const getActionHref = () => {
    switch (status) {
      case 'succeeded':
        return sessionId ? `/session/${sessionId}` : '/dashboard'
      case 'cancelled':
        return '/experts'
      case 'refunded':
        return '/dashboard'
      default:
        return undefined
    }
  }

  const actionHref = getActionHref()

  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
      {/* Status header */}
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full ${config.bgColor}`}
        >
          <span className={config.color}>
            {status === 'processing' ? (
              <svg
                className="animate-spin h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              StatusIcons[config.icon]
            )}
          </span>
        </div>

        {/* Title and description */}
        <h2 className="mt-4 text-xl font-bold text-secondary-900">
          {config.title}
        </h2>
        <p className="mt-2 text-sm text-secondary-600">
          {message || config.description}
        </p>

        {/* Amount display for success */}
        {status === 'succeeded' && amount && (
          <div className="mt-4 rounded-lg bg-green-50 px-6 py-3">
            <span className="text-2xl font-bold text-green-700">
              {formatCurrency(amount)}
            </span>
            <span className="ml-2 text-sm text-green-600">paid</span>
          </div>
        )}
      </div>

      {/* Session details */}
      {showDetails && (expertName || scheduledAt) && (
        <div className="mt-6 rounded-lg border border-secondary-200 bg-secondary-50 p-4">
          <h3 className="text-sm font-medium text-secondary-700">
            Session Details
          </h3>
          <div className="mt-3 space-y-2">
            {expertName && (
              <div className="flex justify-between text-sm">
                <span className="text-secondary-500">Expert</span>
                <span className="font-medium text-secondary-900">
                  {expertName}
                </span>
              </div>
            )}
            {scheduledAt && (
              <div className="flex justify-between text-sm">
                <span className="text-secondary-500">Scheduled</span>
                <span className="font-medium text-secondary-900">
                  {new Date(scheduledAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {sessionId && (
              <div className="flex justify-between text-sm">
                <span className="text-secondary-500">Session ID</span>
                <span className="font-mono text-xs text-secondary-600">
                  {sessionId.slice(0, 8)}...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action button */}
      {config.actionLabel && (
        <div className="mt-6">
          {actionHref ? (
            <Link
              href={actionHref}
              className={`block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors ${
                config.actionVariant === 'primary'
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              {config.actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                config.actionVariant === 'primary'
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              {config.actionLabel}
            </button>
          )}
        </div>
      )}

      {/* Help text for errors */}
      {(status === 'failed' || status === 'requires_action') && (
        <div className="mt-4 text-center">
          <p className="text-xs text-secondary-500">
            Having trouble?{' '}
            <Link
              href="/support"
              className="text-primary-600 hover:text-primary-700"
            >
              Contact Support
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * PaymentStatusFromURL Component
 *
 * Reads payment status from URL search params and displays appropriate status.
 * Useful for handling Stripe redirect returns.
 *
 * Expected URL params:
 * - payment: 'success' | 'cancelled' | 'failed'
 * - payment_intent: Stripe Payment Intent ID (for verification)
 * - redirect_status: Stripe redirect status
 */
export function PaymentStatusFromURL({
  sessionId,
  expertName,
  scheduledAt,
  amount,
}: {
  sessionId: string
  expertName?: string
  scheduledAt?: string
  amount?: number
}) {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<PaymentStatusType>('processing')

  useEffect(() => {
    const paymentParam = searchParams.get('payment')
    const redirectStatus = searchParams.get('redirect_status')

    if (paymentParam === 'success' || redirectStatus === 'succeeded') {
      setStatus('succeeded')
    } else if (paymentParam === 'cancelled') {
      setStatus('cancelled')
    } else if (paymentParam === 'failed' || redirectStatus === 'failed') {
      setStatus('failed')
    } else if (redirectStatus === 'processing') {
      setStatus('processing')
    } else if (redirectStatus === 'requires_action') {
      setStatus('requires_action')
    }
  }, [searchParams])

  // Don't render if no payment params
  if (!searchParams.get('payment') && !searchParams.get('redirect_status')) {
    return null
  }

  return (
    <PaymentStatus
      status={status}
      sessionId={sessionId}
      expertName={expertName}
      scheduledAt={scheduledAt}
      amount={amount}
    />
  )
}

/**
 * Compact payment status badge for lists and cards
 */
interface PaymentBadgeProps {
  status: PaymentStatusType
  className?: string
}

export function PaymentBadge({ status, className = '' }: PaymentBadgeProps) {
  const badgeConfig: Record<
    PaymentStatusType,
    { label: string; classes: string }
  > = {
    pending: {
      label: 'Payment Pending',
      classes: 'bg-gray-100 text-gray-700',
    },
    processing: {
      label: 'Processing',
      classes: 'bg-blue-100 text-blue-700',
    },
    succeeded: {
      label: 'Paid',
      classes: 'bg-green-100 text-green-700',
    },
    failed: {
      label: 'Failed',
      classes: 'bg-red-100 text-red-700',
    },
    cancelled: {
      label: 'Cancelled',
      classes: 'bg-gray-100 text-gray-700',
    },
    refunded: {
      label: 'Refunded',
      classes: 'bg-yellow-100 text-yellow-700',
    },
    requires_action: {
      label: 'Action Required',
      classes: 'bg-orange-100 text-orange-700',
    },
  }

  const config = badgeConfig[status]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  )
}
