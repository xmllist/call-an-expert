'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from '@/app/api/subscription/route'

/**
 * Pricing Page
 *
 * Displays subscription tiers and per-session pricing.
 * Allows users to subscribe to agency plans via Stripe Checkout.
 */

// Check icon SVG component
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

// Format price in dollars
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

interface PricingCardProps {
  plan: SubscriptionPlanKey
  isPopular?: boolean
  onSubscribe: (plan: SubscriptionPlanKey) => void
  isLoading: boolean
  loadingPlan: SubscriptionPlanKey | null
}

function PricingCard({ plan, isPopular, onSubscribe, isLoading, loadingPlan }: PricingCardProps) {
  const details = SUBSCRIPTION_PLANS[plan]
  const isThisLoading = isLoading && loadingPlan === plan

  return (
    <div
      className={`relative rounded-2xl p-8 ${
        isPopular
          ? 'border-2 border-primary-500 bg-white shadow-xl ring-1 ring-primary-500'
          : 'border border-secondary-200 bg-white'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-primary-500 px-4 py-1 text-sm font-semibold text-white">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-lg font-semibold text-secondary-900">{details.name}</h3>
        <div className="mt-4 flex items-baseline justify-center gap-x-2">
          <span className="text-5xl font-bold tracking-tight text-secondary-900">
            {formatPrice(details.price)}
          </span>
          <span className="text-sm font-semibold leading-6 tracking-wide text-secondary-600">
            /year
          </span>
        </div>
        <p className="mt-1 text-sm text-secondary-500">
          ~{formatPrice(details.priceMonthly)}/month
        </p>
        <p className="mt-4 text-sm text-secondary-600">
          {details.sessionsIncluded} expert sessions included
        </p>
      </div>

      <ul className="mt-8 space-y-3">
        {details.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <CheckIcon className="h-5 w-5 flex-shrink-0 text-primary-500" />
            <span className="text-sm text-secondary-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSubscribe(plan)}
        disabled={isLoading}
        className={`mt-8 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isPopular
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200'
        }`}
      >
        {isThisLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
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
          `Subscribe to ${details.name}`
        )}
      </button>
    </div>
  )
}

export default function PricingPage() {
  const searchParams = useSearchParams()
  const subscriptionStatus = searchParams.get('subscription')

  const [isLoading, setIsLoading] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (plan: SubscriptionPlanKey) => {
    setIsLoading(true)
    setLoadingPlan(plan)
    setError(null)

    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login
          window.location.href = `/login?redirectTo=/pricing`
          return
        }

        if (response.status === 409) {
          setError('You already have an active subscription. Manage it from your dashboard.')
          return
        }

        throw new Error(data.message || 'Failed to create subscription')
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white border-b border-secondary-200">
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary-600">
              Call an Expert
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/experts"
                className="text-sm text-secondary-600 hover:text-secondary-900"
              >
                Find Experts
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-secondary-600 hover:text-secondary-900"
              >
                Dashboard
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Status Messages */}
      {subscriptionStatus === 'canceled' && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="container-app py-3">
            <p className="text-sm text-yellow-800">
              Subscription checkout was canceled. You can try again when you&apos;re ready.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="container-app py-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="py-16 sm:py-24">
        <div className="container-app">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-secondary-900 sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-lg leading-8 text-secondary-600">
              Pay per session or save with an annual subscription. All plans include access to our
              vetted expert network, screen sharing, and real-time chat.
            </p>
          </div>
        </div>
      </section>

      {/* Per-Session Pricing */}
      <section className="pb-16">
        <div className="container-app">
          <div className="mx-auto max-w-lg">
            <div className="rounded-2xl border border-secondary-200 bg-white p-8 text-center">
              <h2 className="text-lg font-semibold text-secondary-900">Pay Per Session</h2>
              <p className="mt-2 text-sm text-secondary-600">
                No commitment required. Pay only for the help you need.
              </p>
              <div className="mt-6 flex items-baseline justify-center gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-secondary-900">
                  $15-50
                </span>
                <span className="text-sm font-semibold leading-6 tracking-wide text-secondary-600">
                  /session
                </span>
              </div>
              <p className="mt-2 text-sm text-secondary-500">
                Price varies by expert rate (15-minute sessions)
              </p>

              <ul className="mt-8 space-y-3 text-left">
                <li className="flex items-center gap-3">
                  <CheckIcon className="h-5 w-5 flex-shrink-0 text-primary-500" />
                  <span className="text-sm text-secondary-700">15-minute expert sessions</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon className="h-5 w-5 flex-shrink-0 text-primary-500" />
                  <span className="text-sm text-secondary-700">Screen sharing included</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon className="h-5 w-5 flex-shrink-0 text-primary-500" />
                  <span className="text-sm text-secondary-700">Real-time chat</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckIcon className="h-5 w-5 flex-shrink-0 text-primary-500" />
                  <span className="text-sm text-secondary-700">Session notes saved</span>
                </li>
              </ul>

              <Link
                href="/experts"
                className="mt-8 inline-block w-full rounded-lg bg-secondary-900 px-4 py-3 text-sm font-semibold text-white hover:bg-secondary-800 transition-colors"
              >
                Browse Experts
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Plans */}
      <section className="py-16 bg-white">
        <div className="container-app">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl">
              Save with annual subscriptions
            </h2>
            <p className="mt-4 text-lg text-secondary-600">
              For teams and agencies that need regular expert support. Get bulk sessions at a
              discounted rate.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-3">
            <PricingCard
              plan="starter"
              onSubscribe={handleSubscribe}
              isLoading={isLoading}
              loadingPlan={loadingPlan}
            />
            <PricingCard
              plan="professional"
              isPopular
              onSubscribe={handleSubscribe}
              isLoading={isLoading}
              loadingPlan={loadingPlan}
            />
            <PricingCard
              plan="enterprise"
              onSubscribe={handleSubscribe}
              isLoading={isLoading}
              loadingPlan={loadingPlan}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-secondary-50">
        <div className="container-app">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-secondary-900 text-center">
              Frequently asked questions
            </h2>

            <div className="mt-12 space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  How does pay-per-session work?
                </h3>
                <p className="mt-2 text-secondary-600">
                  Browse our expert directory, select an expert, and book a time slot. You&apos;ll
                  pay when you book, and the session is 15 minutes long. If you need more time, you
                  can book additional sessions.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  What&apos;s included in subscriptions?
                </h3>
                <p className="mt-2 text-secondary-600">
                  Subscriptions include a set number of session credits per year, priority expert
                  matching, and dedicated support. Credits don&apos;t roll over but are
                  significantly cheaper than pay-per-session rates.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Can I cancel my subscription?
                </h3>
                <p className="mt-2 text-secondary-600">
                  Yes, you can cancel anytime. Your subscription will remain active until the end of
                  your current billing period. You&apos;ll still have access to your remaining
                  session credits until then.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  What if the session doesn&apos;t help?
                </h3>
                <p className="mt-2 text-secondary-600">
                  If you&apos;re not satisfied with a session, let us know within 24 hours. We
                  review each case and may offer a credit for a future session or a partial refund
                  depending on the circumstances.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  How are experts vetted?
                </h3>
                <p className="mt-2 text-secondary-600">
                  All experts go through a manual review process. We verify their experience, review
                  their portfolio, and assess their communication skills. Only top professionals
                  make it to our platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 py-16">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to get unstuck?
            </h2>
            <p className="mt-4 text-lg text-primary-100">
              Start with a single session or save with a subscription. Either way, you&apos;re just
              minutes away from expert help.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-lg bg-white px-8 py-4 text-base font-semibold text-primary-600 shadow-sm hover:bg-primary-50 transition-colors sm:w-auto"
              >
                Get Started Free
              </Link>
              <Link
                href="/experts"
                className="w-full rounded-lg border-2 border-white px-8 py-4 text-base font-semibold text-white hover:bg-primary-700 transition-colors sm:w-auto"
              >
                Browse Experts
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 py-12">
        <div className="container-app">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-secondary-400">
              &copy; {new Date().getFullYear()} Call an Expert. All rights reserved.
            </div>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-secondary-400 hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-secondary-400 hover:text-white">
                Terms
              </Link>
              <Link href="/contact" className="text-sm text-secondary-400 hover:text-white">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
