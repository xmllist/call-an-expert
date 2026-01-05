import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExpertApplicationForm from '@/components/ExpertApplicationForm'

/**
 * Become Expert page metadata.
 */
export const metadata = {
  title: 'Become an Expert | Last20 - Call an Expert',
  description:
    'Apply to become an expert on Last20 and help developers finish their AI projects. Set your own rates, work when you want, and earn money sharing your skills.',
}

/**
 * Become Expert page - Expert application and onboarding flow.
 * Protected route - requires authentication.
 * Shows different content based on user's expert status:
 * - No expert record: Show application form
 * - Expert pending approval: Show pending status
 * - Expert approved: Redirect to expert dashboard
 */
export default async function BecomeExpertPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/become-expert')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check if user already has an expert profile
  const { data: existingExpert } = await supabase
    .from('experts')
    .select('*')
    .eq('id', user.id)
    .single()

  // If approved, redirect to expert dashboard
  if (existingExpert?.approved) {
    redirect('/expert/dashboard')
  }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User'

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
              href="/experts"
              className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors"
            >
              Browse Experts
            </Link>
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-primary-700">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="container-app py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-secondary-900 sm:text-4xl">
              Become an Expert
            </h1>
            <p className="mt-3 text-lg text-secondary-600">
              Share your expertise, help developers succeed, and earn money on
              your own schedule.
            </p>
          </div>

          {/* Application Pending State */}
          {existingExpert && !existingExpert.approved && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-8 text-center mb-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-yellow-900 mb-2">
                Application Under Review
              </h3>
              <p className="text-yellow-700 mb-4">
                Your expert application is being reviewed by our team. This
                typically takes 2-3 business days. We&apos;ll notify you via email
                once your application is approved.
              </p>

              {/* Show application details */}
              <div className="mt-6 rounded-lg bg-white border border-yellow-200 p-4 text-left">
                <h4 className="font-medium text-secondary-900 mb-3">
                  Your Application Details
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-secondary-500">Rate</dt>
                    <dd className="font-medium text-secondary-900">
                      ${(existingExpert.session_rate / 100).toFixed(0)}/session
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-secondary-500">Expertise</dt>
                    <dd className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                      {existingExpert.expertise_tags
                        .slice(0, 3)
                        .map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded bg-secondary-100 px-1.5 py-0.5 text-xs text-secondary-600"
                          >
                            {tag}
                          </span>
                        ))}
                      {existingExpert.expertise_tags.length > 3 && (
                        <span className="text-xs text-secondary-400">
                          +{existingExpert.expertise_tags.length - 3}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-secondary-500">Applied</dt>
                    <dd className="font-medium text-secondary-900">
                      {new Date(existingExpert.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-lg bg-yellow-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-yellow-700 transition-colors"
                >
                  Back to Dashboard
                </Link>
                <a
                  href="mailto:support@last20.com"
                  className="inline-flex items-center justify-center rounded-lg border border-yellow-300 bg-white px-4 py-2.5 text-sm font-semibold text-yellow-700 shadow-sm hover:bg-yellow-50 transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          )}

          {/* Application Form - Only show if no existing application */}
          {!existingExpert && (
            <>
              {/* Benefits Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="rounded-xl border border-secondary-200 bg-white p-5 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 mb-3">
                    <svg
                      className="h-5 w-5 text-primary-600"
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
                  </div>
                  <h3 className="font-semibold text-secondary-900">
                    Earn $15-50
                  </h3>
                  <p className="text-sm text-secondary-600">
                    Per 15-minute session
                  </p>
                </div>

                <div className="rounded-xl border border-secondary-200 bg-white p-5 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 mb-3">
                    <svg
                      className="h-5 w-5 text-primary-600"
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
                  </div>
                  <h3 className="font-semibold text-secondary-900">
                    Your Schedule
                  </h3>
                  <p className="text-sm text-secondary-600">
                    Work when it suits you
                  </p>
                </div>

                <div className="rounded-xl border border-secondary-200 bg-white p-5 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 mb-3">
                    <svg
                      className="h-5 w-5 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-secondary-900">
                    Make Impact
                  </h3>
                  <p className="text-sm text-secondary-600">
                    Help devs ship faster
                  </p>
                </div>
              </div>

              {/* Form Card */}
              <div className="rounded-xl border border-secondary-200 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-secondary-900 mb-6">
                  Expert Application
                </h2>
                <ExpertApplicationForm
                  userId={user.id}
                  initialName={profile?.full_name || ''}
                />
              </div>
            </>
          )}

          {/* FAQ Section */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-secondary-900 mb-6 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <details className="group rounded-lg border border-secondary-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-secondary-900">
                  How does payment work?
                  <svg
                    className="h-5 w-5 text-secondary-500 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="border-t border-secondary-200 p-4 text-secondary-600 text-sm">
                  You receive 90% of your session rate. Payments are processed
                  through Stripe and deposited weekly to your connected bank
                  account. You&apos;ll need to set up Stripe Connect after
                  approval.
                </div>
              </details>

              <details className="group rounded-lg border border-secondary-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-secondary-900">
                  What qualifications do I need?
                  <svg
                    className="h-5 w-5 text-secondary-500 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="border-t border-secondary-200 p-4 text-secondary-600 text-sm">
                  We look for experts with practical experience in their areas
                  of expertise. This could be professional work experience,
                  open-source contributions, or demonstrated projects. Formal
                  degrees are not required.
                </div>
              </details>

              <details className="group rounded-lg border border-secondary-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-secondary-900">
                  How long are sessions?
                  <svg
                    className="h-5 w-5 text-secondary-500 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="border-t border-secondary-200 p-4 text-secondary-600 text-sm">
                  Sessions are 15 minutes long. This focused format helps users
                  get quick help with specific issues. If more time is needed,
                  users can book additional sessions.
                </div>
              </details>

              <details className="group rounded-lg border border-secondary-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-secondary-900">
                  Can I also be a user?
                  <svg
                    className="h-5 w-5 text-secondary-500 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="border-t border-secondary-200 p-4 text-secondary-600 text-sm">
                  Absolutely! Your account works for both. You can help others
                  as an expert and also book sessions with other experts when
                  you need help. Many of our best experts are also active users.
                </div>
              </details>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
