'use client'

import { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js'
import type { StripePaymentElementOptions } from '@stripe/stripe-js'
import { getStripe } from '@/lib/stripe/client'

/**
 * Session data for payment context
 */
export interface SessionPaymentData {
  id: string
  expert_id: string
  scheduled_at: string
  duration_minutes: number
  amount: number // in cents
  formattedAmount: string
  platformFee: number
  expertPayout: number
}

/**
 * Props for the CheckoutForm component
 */
interface CheckoutFormProps {
  /** Stripe Payment Intent client secret */
  clientSecret: string
  /** Session data for display */
  session: SessionPaymentData
  /** Expert name for display */
  expertName: string
  /** Callback when payment succeeds */
  onSuccess?: () => void
  /** Callback when payment fails */
  onError?: (error: string) => void
  /** Return URL after payment completion */
  returnUrl?: string
}

/**
 * Internal form component that uses Stripe hooks
 */
function CheckoutFormContent({
  session,
  expertName,
  onSuccess,
  onError,
  returnUrl,
}: Omit<CheckoutFormProps, 'clientSecret'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url:
            returnUrl ||
            `${window.location.origin}/session/${session.id}?payment=success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        // Payment failed
        const message =
          error.type === 'card_error' || error.type === 'validation_error'
            ? error.message || 'Payment failed'
            : 'An unexpected error occurred. Please try again.'

        setErrorMessage(message)
        onError?.(message)
      } else {
        // Payment succeeded
        onSuccess?.()
      }
    } catch (err) {
      const message = 'An unexpected error occurred. Please try again.'
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: 'tabs',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Session summary */}
      <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-4">
        <h3 className="font-medium text-secondary-900">Session Details</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-secondary-600">Expert</span>
            <span className="font-medium text-secondary-900">{expertName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600">Duration</span>
            <span className="font-medium text-secondary-900">
              {session.duration_minutes} minutes
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600">Scheduled</span>
            <span className="font-medium text-secondary-900">
              {new Date(session.scheduled_at).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="border-t border-secondary-200 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="font-medium text-secondary-900">Total</span>
              <span className="font-bold text-secondary-900">
                {session.formattedAmount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="rounded-xl border border-secondary-200 bg-white p-4">
        <PaymentElement
          id="payment-element"
          options={paymentElementOptions}
        />
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
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
            Processing...
          </span>
        ) : (
          `Pay ${session.formattedAmount}`
        )}
      </button>

      {/* Security note */}
      <div className="flex items-center justify-center gap-2 text-xs text-secondary-500">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>Secured by Stripe. Your payment info is encrypted.</span>
      </div>
    </form>
  )
}

/**
 * CheckoutForm Component
 *
 * Provides a complete checkout experience for session booking using Stripe Elements.
 * Wraps the form in Elements provider with the Payment Intent client secret.
 *
 * Features:
 * - Stripe PaymentElement for card, Apple Pay, Google Pay, etc.
 * - Session summary with expert name and scheduled time
 * - Loading and error states
 * - Secure payment processing via Stripe
 *
 * Usage:
 * ```tsx
 * <CheckoutForm
 *   clientSecret="pi_xxx_secret_xxx"
 *   session={sessionData}
 *   expertName="John Doe"
 *   onSuccess={() => router.push('/session/123')}
 *   onError={(msg) => toast.error(msg)}
 * />
 * ```
 */
export default function CheckoutForm({
  clientSecret,
  session,
  expertName,
  onSuccess,
  onError,
  returnUrl,
}: CheckoutFormProps) {
  const stripePromise = getStripe()

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#7c3aed', // primary-600
            colorBackground: '#ffffff',
            colorText: '#1f2937', // secondary-800
            colorDanger: '#dc2626', // red-600
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '8px',
            spacingUnit: '4px',
          },
          rules: {
            '.Input': {
              border: '1px solid #e5e7eb', // secondary-200
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            },
            '.Input:focus': {
              border: '1px solid #7c3aed', // primary-600
              boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.2)',
            },
            '.Label': {
              fontWeight: '500',
              marginBottom: '4px',
            },
          },
        },
      }}
    >
      <CheckoutFormContent
        session={session}
        expertName={expertName}
        onSuccess={onSuccess}
        onError={onError}
        returnUrl={returnUrl}
      />
    </Elements>
  )
}

/**
 * Wrapper component for creating a payment intent and showing checkout
 */
interface CheckoutWrapperProps {
  sessionId: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

/**
 * CheckoutWrapper fetches the payment intent and renders the checkout form.
 * Use this when you don't already have the client secret.
 */
export function CheckoutWrapper({
  sessionId,
  onSuccess,
  onError,
}: CheckoutWrapperProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<{
    clientSecret: string
    session: SessionPaymentData
    expertName: string
  } | null>(null)

  // Fetch payment intent on mount
  useState(() => {
    async function fetchPaymentIntent() {
      try {
        const response = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message || 'Failed to create payment')
        }

        const data = await response.json()
        setPaymentData({
          clientSecret: data.clientSecret,
          session: {
            id: data.session.id,
            expert_id: data.session.expert_id,
            scheduled_at: data.session.scheduled_at,
            duration_minutes: data.session.duration_minutes,
            amount: data.amount,
            formattedAmount: data.formattedAmount,
            platformFee: data.platformFee,
            expertPayout: data.expertPayout,
          },
          expertName: 'Expert', // Would need to fetch this separately
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to initialize payment'
        setError(message)
        onError?.(message)
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentIntent()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-8 w-8 text-primary-600"
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
          <p className="text-sm text-secondary-600">Preparing checkout...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-5 w-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-red-900">Payment Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return null
  }

  return (
    <CheckoutForm
      clientSecret={paymentData.clientSecret}
      session={paymentData.session}
      expertName={paymentData.expertName}
      onSuccess={onSuccess}
      onError={onError}
    />
  )
}
