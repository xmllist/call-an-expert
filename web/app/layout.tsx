import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Call an Expert - Get Help When You\'re Stuck',
  description: 'Connect with vetted experts for 15-minute screen sharing sessions. Get unstuck on your AI projects with real-time help from professionals.',
  keywords: ['AI help', 'coding help', 'expert sessions', 'screen sharing', 'programming assistance'],
  authors: [{ name: 'Call an Expert' }],
  openGraph: {
    title: 'Call an Expert - Get Help When You\'re Stuck',
    description: 'Connect with vetted experts for 15-minute screen sharing sessions.',
    type: 'website',
  },
}

/**
 * Providers wrapper component for client-side providers.
 * This will be extended to include Auth, Stripe, and Socket providers.
 */
function Providers({ children }: { children: React.ReactNode }) {
  // Future providers will be added here:
  // - AuthProvider (Supabase auth context)
  // - StripeProvider (Elements provider)
  // - SocketProvider (Socket.io context)
  return <>{children}</>
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white text-secondary-900 antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
