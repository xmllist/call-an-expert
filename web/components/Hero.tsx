import Link from 'next/link'

/**
 * Hero section component for the landing page.
 * Displays the main value proposition and call-to-action buttons.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Background gradient decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary-50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary-200 to-transparent" />
      </div>

      <div className="container-app py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
            </span>
            Live experts available now
          </div>

          {/* Main headline */}
          <h1 className="text-4xl font-bold tracking-tight text-secondary-900 sm:text-5xl lg:text-6xl">
            Get expert help when you&apos;re{' '}
            <span className="text-primary-600">stuck at 80%</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-secondary-600 sm:text-xl">
            Connect with vetted experts for 15-minute screen sharing sessions.
            Get unstuck on your AI projects with real-time help from professionals
            who&apos;ve been there.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors sm:w-auto"
            >
              Get Help Now
            </Link>
            <Link
              href="/experts"
              className="w-full rounded-lg border border-secondary-300 bg-white px-8 py-4 text-base font-semibold text-secondary-700 shadow-sm hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors sm:w-auto"
            >
              Browse Experts
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-col items-center justify-center gap-8 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-secondary-500">
              <svg
                className="h-5 w-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span>15-minute sessions</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-secondary-500">
              <svg
                className="h-5 w-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span>$15-50 per session</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-secondary-500">
              <svg
                className="h-5 w-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Vetted experts only</span>
            </div>
          </div>
        </div>

        {/* Stats section */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-6 text-center">
              <div className="text-3xl font-bold text-secondary-900">500+</div>
              <div className="mt-1 text-sm text-secondary-600">Sessions completed</div>
            </div>
            <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-6 text-center">
              <div className="text-3xl font-bold text-secondary-900">50+</div>
              <div className="mt-1 text-sm text-secondary-600">Expert mentors</div>
            </div>
            <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-6 text-center">
              <div className="text-3xl font-bold text-secondary-900">4.9</div>
              <div className="mt-1 text-sm text-secondary-600">Avg rating</div>
            </div>
            <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-6 text-center">
              <div className="text-3xl font-bold text-secondary-900">&lt;2min</div>
              <div className="mt-1 text-sm text-secondary-600">Avg response time</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
