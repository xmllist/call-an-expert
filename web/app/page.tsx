import Link from 'next/link'
import Hero from '@/components/Hero'
import Features from '@/components/Features'

/**
 * Landing page for Call an Expert platform.
 * Server Component - no 'use client' needed for static content.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-secondary-200 bg-white/80 backdrop-blur-md">
        <div className="container-app">
          <nav className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold text-secondary-900">
                Call an Expert
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden items-center gap-8 md:flex">
              <Link
                href="/experts"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Browse Experts
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/experts/apply"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Become an Expert
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Hero />
        <Features />
      </main>

      {/* Footer */}
      <footer className="border-t border-secondary-200 bg-secondary-50">
        <div className="container-app py-12">
          <div className="grid gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                    />
                  </svg>
                </div>
                <span className="text-lg font-bold text-secondary-900">
                  Call an Expert
                </span>
              </Link>
              <p className="mt-4 text-sm text-secondary-600">
                Connect with vetted experts for 15-minute screen sharing sessions.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-secondary-900">Product</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    href="/experts"
                    className="text-sm text-secondary-600 hover:text-secondary-900 transition-colors"
                  >
                    Browse Experts
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-sm text-secondary-600 hover:text-secondary-900 transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/extension"
                    className="text-sm text-secondary-600 hover:text-secondary-900 transition-colors"
                  >
                    Chrome Extension
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-sm font-semibold text-secondary-900">Company</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-secondary-600 hover:text-secondary-900 transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/experts/apply"
                    className="text-sm text-secondary-600 hover:text-secondary-900 transition-colors"
                  >
                    Become an Expert
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-secondary-600 hover:text-secondary-900 transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-secondary-900">Legal</h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-secondary-600 hover:text-secondary-900 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-secondary-600 hover:text-secondary-900 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 border-t border-secondary-200 pt-8">
            <p className="text-center text-sm text-secondary-500">
              &copy; {new Date().getFullYear()} Call an Expert. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
