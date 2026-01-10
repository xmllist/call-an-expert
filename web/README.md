# Call-an-Expert Web

This is the web application for Call-an-Expert, built with Next.js 14, React, and TypeScript.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + custom components
- **Database**: Supabase
- **Video**: Daily.co
- **Payments**: Stripe

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials.

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
web/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard pages
│   │   ├── expert/        # Expert dashboard
│   │   ├── session/       # Session pages
│   │   └── page.tsx       # User dashboard
│   ├── login/             # Authentication pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── ui/                # Reusable UI components (shadcn/ui style)
│   ├── layout/            # Layout components (Header, Sidebar)
│   ├── sessions/          # Session-related components
│   ├── experts/           # Expert-related components
│   └── video/             # Video call components
├── lib/                   # Utilities and clients
│   ├── supabase.ts        # Supabase client and types
│   ├── stripe.ts          # Stripe client
│   └── daily.ts           # Daily.co utilities
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts         # Authentication hook
│   ├── useSession.ts      # Session management hook
│   ├── useRealtime.ts     # Real-time updates hook
│   └── useExpert.ts       # Expert data hook
└── types/                 # TypeScript type exports
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_DAILY_DOMAIN` | Daily.co domain |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
