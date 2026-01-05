/**
 * Features section component for the landing page.
 * Displays the key features and benefits of the platform.
 */

const features = [
  {
    name: 'Instant Screen Sharing',
    description:
      'Share your screen with one click. Show experts exactly where you\'re stuck - no setup, no downloads, no hassle.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
        />
      </svg>
    ),
  },
  {
    name: 'Chrome Extension',
    description:
      'Capture your issue directly from your browser. Screenshot, error messages, and context - all in one click.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z"
        />
      </svg>
    ),
  },
  {
    name: 'Expert Matching',
    description:
      'Our system matches you with experts based on your tech stack, problem type, and availability. Right expert, right time.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        />
      </svg>
    ),
  },
  {
    name: 'Real-time Chat',
    description:
      'Chat with your expert during the session. Share code snippets, links, and notes that persist after the session ends.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
        />
      </svg>
    ),
  },
  {
    name: 'Pay Per Session',
    description:
      'No subscriptions required. Pay only for the sessions you need. Transparent pricing from $15-50 per 15-minute session.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
        />
      </svg>
    ),
  },
  {
    name: 'Vetted Experts',
    description:
      'All experts are manually vetted for their skills and communication. Only the top professionals make it to our platform.',
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
]

const howItWorks = [
  {
    step: '1',
    title: 'Describe Your Issue',
    description:
      'Use our Chrome extension to capture screenshots and describe where you\'re stuck. The more context, the better.',
  },
  {
    step: '2',
    title: 'Get Matched',
    description:
      'Our system finds experts with the right skills for your specific problem. Choose from available matches.',
  },
  {
    step: '3',
    title: 'Start a Session',
    description:
      'Pay securely and connect via screen share. Your expert guides you through solving the problem in real-time.',
  },
]

export default function Features() {
  return (
    <>
      {/* How it Works Section */}
      <section className="bg-secondary-50 py-16 sm:py-24">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-secondary-600">
              Get help in three simple steps. No complicated setup required.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <div className="grid gap-8 md:grid-cols-3">
              {howItWorks.map((item) => (
                <div
                  key={item.step}
                  className="relative rounded-xl border border-secondary-200 bg-white p-8"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-secondary-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="bg-white py-16 sm:py-24">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl">
              Everything you need to get unstuck
            </h2>
            <p className="mt-4 text-lg text-secondary-600">
              We built the tools you need to go from stuck to shipped.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.name}
                  className="rounded-xl border border-secondary-200 p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-secondary-900">
                    {feature.name}
                  </h3>
                  <p className="mt-2 text-secondary-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="bg-secondary-900 py-16 sm:py-24">
        <div className="container-app">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-secondary-300">
              Pay per session or save with a subscription for teams.
            </p>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {/* Per Session */}
              <div className="rounded-xl border border-secondary-700 bg-secondary-800 p-8 text-left">
                <h3 className="text-lg font-semibold text-white">Pay Per Session</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">$15-50</span>
                  <span className="text-secondary-400">/session</span>
                </div>
                <p className="mt-4 text-secondary-300">
                  Perfect for individual developers who need occasional help.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-3 text-secondary-300">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-primary-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    15-minute sessions
                  </li>
                  <li className="flex items-center gap-3 text-secondary-300">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-primary-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Screen sharing included
                  </li>
                  <li className="flex items-center gap-3 text-secondary-300">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-primary-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Chat history saved
                  </li>
                </ul>
              </div>

              {/* Subscription */}
              <div className="rounded-xl border-2 border-primary-500 bg-secondary-800 p-8 text-left">
                <div className="mb-2 inline-block rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white">
                  Best Value
                </div>
                <h3 className="text-lg font-semibold text-white">Agency Subscription</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">$99-499</span>
                  <span className="text-secondary-400">/year</span>
                </div>
                <p className="mt-4 text-secondary-300">
                  For teams and agencies that need regular support.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-3 text-secondary-300">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-primary-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Bulk session credits
                  </li>
                  <li className="flex items-center gap-3 text-secondary-300">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-primary-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Priority matching
                  </li>
                  <li className="flex items-center gap-3 text-secondary-300">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-primary-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Team management
                  </li>
                </ul>
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
              Join hundreds of developers who&apos;ve shipped their projects with expert help.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="/signup"
                className="w-full rounded-lg bg-white px-8 py-4 text-base font-semibold text-primary-600 shadow-sm hover:bg-primary-50 transition-colors sm:w-auto"
              >
                Get Started Free
              </a>
              <a
                href="/experts/apply"
                className="w-full rounded-lg border-2 border-white px-8 py-4 text-base font-semibold text-white hover:bg-primary-700 transition-colors sm:w-auto"
              >
                Become an Expert
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
