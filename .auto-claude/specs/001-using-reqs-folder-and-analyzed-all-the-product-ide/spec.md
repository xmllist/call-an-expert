# Specification: Call-an-Expert MVP Platform

## Overview

Build a full-stack platform that connects non-developers stuck at 80% completion on AI projects with vetted experts who can help them finish. The service operates through a Chrome extension that captures project issues, matches users with relevant experts, and facilitates 15-minute screen sharing sessions. Users pay per session ($15-50) or via subscription ($99-499/year for agencies), with experts setting their own rates and the platform taking 10%. This MVP targets AI hobbyists using tools like Cursor, Replit, and v0 who hit roadblocks they can't solve with ChatGPT or Stack Overflow.

## Workflow Type

**Type**: feature

**Rationale**: This is a greenfield MVP build requiring multiple new services (Chrome extension, web app, real-time communication, payment processing) with no existing codebase to modify. The feature workflow allows systematic implementation of each component.

## Task Scope

### Services Involved
- **chrome-extension** (primary) - Issue capture, screenshot tool, context gathering for expert matching
- **web-app** (primary) - Next.js dashboard for users and experts, authentication, session management
- **backend-api** (primary) - Supabase-powered API for user data, expert profiles, session tracking
- **real-time** (primary) - Socket.io chat and WebRTC screen sharing infrastructure
- **payments** (integration) - Stripe integration for per-session and subscription billing

### This Task Will:
- [ ] Create Chrome extension (Manifest V3) for capturing AI project issues and screenshots
- [ ] Build Next.js 15 web application with App Router for user/expert dashboards
- [ ] Set up Supabase database with user, expert, and session schemas (RLS enabled)
- [ ] Implement Supabase Auth for user authentication with email/OAuth
- [ ] Create expert matching algorithm based on expertise tags and availability
- [ ] Integrate Socket.io for real-time chat between users and experts
- [ ] Implement WebRTC-based screen sharing for 15-minute expert sessions
- [ ] Set up Stripe payment processing for per-session and subscription payments
- [ ] Build expert onboarding and vetting workflow
- [ ] Create session booking, scheduling, and completion flow

### Out of Scope:
- Mobile applications (iOS/Android)
- Advanced AI-powered matching (simple tag-based for MVP)
- Expert certification/testing system (manual vetting for MVP)
- Multi-language support
- Analytics dashboard beyond basic metrics
- Video recording of sessions

## Service Context

### Chrome Extension

**Tech Stack:**
- Language: JavaScript/TypeScript
- Framework: Manifest V3 (Chrome Extensions)
- Key directories: `extension/`, `extension/src/`, `extension/manifest.json`

**Entry Point:** `extension/manifest.json`

**How to Build:**
```bash
cd extension && npm run build
# Load unpacked extension in Chrome at chrome://extensions
```

**Key APIs:** `chrome.runtime`, `chrome.tabs`, `chrome.storage`, `chrome.action`, `chrome.scripting`

**Critical Constraints:**
- Must use Manifest V3 (MV2 deprecated in 2025)
- Service workers replace background pages (not persistent)
- Minimal permissions to avoid Chrome Web Store rejection
- No remotely hosted code allowed
- Privacy policy required for publication

---

### Web Application (Next.js)

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js 15.5.x with App Router
- React: 19.x with Server Components
- Styling: Tailwind CSS
- Key directories: `web/`, `web/app/`, `web/components/`, `web/lib/`

**Entry Point:** `web/app/layout.tsx`

**How to Run:**
```bash
cd web && npm run dev
```

**Port:** 3000

**Critical Constraints:**
- Use App Router (not Pages Router)
- React Server Components by default
- fetch/GET routes NOT cached by default (Next.js 15 change)
- Use latest patched version (CVE-2025-29927 auth bypass in v11.1.4-15.2.2)

---

### Supabase Backend

**Tech Stack:**
- Database: PostgreSQL
- Auth: Supabase Auth
- Real-time: Supabase Realtime (for basic presence)
- Storage: Supabase Storage (for screenshots/attachments)

**How to Run:**
```bash
# Use Supabase cloud project or local:
npx supabase start
```

**Port:** 54321 (local)

**Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=<project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>  # Server-side only!
```

**Critical Constraints:**
- Row-Level Security (RLS) MUST be enabled on all tables
- Service role key NEVER exposed to client
- Free tier: 500MB DB, 1GB storage, 50K MAU

---

### Real-time Communication

**Tech Stack:**
- Chat: Socket.io (server + client)
- Screen Sharing: WebRTC (native browser API)
- STUN/TURN: Public STUN + optional TURN server

**Key directories:** `web/lib/socket/`, `web/lib/webrtc/`

**How to Run:**
```bash
# Socket.io server runs with Next.js API routes or separate server
```

**Port:** 3001 (if separate server)

**Critical Constraints:**
- CORS config required for Socket.io
- WebRTC requires HTTPS in production
- Safari has limited WebRTC support - implement fallbacks
- STUN/TURN servers needed for NAT traversal
- Plan for scaling persistent WebSocket connections

---

### Payments (Stripe)

**Tech Stack:**
- Backend: `stripe` Node.js SDK
- Frontend: `@stripe/react-stripe-js`, `@stripe/stripe-js`
- API: Payment Intents API (not deprecated Tokens/Sources)

**Environment Variables:**
```
STRIPE_SECRET_KEY=sk_...          # Server-side only!
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Critical Constraints:**
- Never expose secret key client-side
- Webhook signature verification required
- Requires Node.js 18+
- Use Payment Intents API

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `extension/manifest.json` | chrome-extension | Create Manifest V3 config with minimal permissions |
| `extension/src/popup.tsx` | chrome-extension | Build issue capture form with screenshot tool |
| `extension/src/background.ts` | chrome-extension | Service worker for API communication |
| `extension/src/content.ts` | chrome-extension | Content script for page context capture |
| `web/app/layout.tsx` | web-app | Root layout with providers (Auth, Stripe, Socket) |
| `web/app/page.tsx` | web-app | Landing page for the service |
| `web/app/dashboard/page.tsx` | web-app | User dashboard showing sessions and experts |
| `web/app/expert/page.tsx` | web-app | Expert dashboard with queue and earnings |
| `web/app/session/[id]/page.tsx` | web-app | Active session page with chat and screen share |
| `web/app/api/session/route.ts` | web-app | API route for session CRUD |
| `web/app/api/webhook/stripe/route.ts` | web-app | Stripe webhook handler |
| `web/lib/supabase/client.ts` | web-app | Supabase client configuration |
| `web/lib/supabase/server.ts` | web-app | Supabase server-side client |
| `web/lib/socket/client.ts` | web-app | Socket.io client setup |
| `web/lib/webrtc/peer.ts` | web-app | WebRTC peer connection handler |
| `server/socket.ts` | real-time | Socket.io server with room-based messaging |
| `supabase/migrations/001_initial_schema.sql` | backend | Database schema for all tables |
| `supabase/migrations/002_rls_policies.sql` | backend | Row-Level Security policies |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `reqs/ai-hired-helper-app-*.md` | Product requirements and pricing model |
| `reqs/screenshots/page_001.png` | UI/UX reference for landing page |
| `reqs/screenshots/page_010.png` | Lead magnet and builder templates |

## Patterns to Follow

### Chrome Extension - Manifest V3 Pattern

```json
{
  "manifest_version": 3,
  "name": "Last20 - Call an Expert",
  "version": "1.0.0",
  "description": "Get expert help when you're stuck on AI projects",
  "permissions": ["activeTab", "storage"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

**Key Points:**
- Use `manifest_version: 3`
- Minimal permissions (only `activeTab`, `storage`)
- Service worker for background tasks
- Content scripts for page context capture

---

### Supabase Client Pattern

```typescript
// web/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// web/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
```

**Key Points:**
- Install both packages: `npm install @supabase/supabase-js @supabase/ssr`
- Use `@supabase/ssr` for Next.js App Router (wraps `@supabase/supabase-js`)
- Separate client and server configurations
- Cookie-based session handling
- Server-side `setAll` wrapped in try/catch for Server Component compatibility

---

### Socket.io Server Pattern

```typescript
// server/socket.ts (or separate server.js file)
import { Server } from 'socket.io'
import { createServer } from 'http'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join-session', ({ sessionId, userId }) => {
    socket.join(`session:${sessionId}`)
    socket.to(`session:${sessionId}`).emit('user-joined', { userId })
  })

  socket.on('chat-message', ({ sessionId, message, senderId }) => {
    io.to(`session:${sessionId}`).emit('new-message', { message, senderId })
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

httpServer.listen(3001, () => {
  console.log('Socket.io server running on port 3001')
})
```

**Key Points:**
- CORS configuration required for cross-origin requests
- Room-based messaging with `socket.join()` and `io.to(room).emit()`
- Rooms are server-side only - clients emit to join

---

### Socket.io Client Pattern

```typescript
// web/lib/socket/client.ts
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function joinSession(sessionId: string, userId: string) {
  const socket = getSocket()
  socket.connect()
  socket.emit('join-session', { sessionId, userId })
}
```

**Key Points:**
- Singleton pattern for socket instance
- Manual connection management (`autoConnect: false`)
- Prefer WebSocket transport with polling fallback

---

### WebRTC Screen Share Pattern

```typescript
// web/lib/webrtc/peer.ts
export async function startScreenShare(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: true
    })
    return stream
  } catch (error) {
    console.error('Screen share failed:', error)
    throw error
  }
}

export function createPeerConnection(config: RTCConfiguration): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Add TURN server for production
    ],
    ...config
  })
}
```

**Key Points:**
- Use `getDisplayMedia()` for screen sharing
- Include STUN servers for connectivity
- Handle permission denial gracefully

---

### Stripe Payment Intent Pattern

```typescript
// web/app/api/payment/route.ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const { amount, sessionId } = await request.json()

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // cents
    currency: 'usd',
    metadata: { sessionId },
  })

  return Response.json({ clientSecret: paymentIntent.client_secret })
}
```

**Key Points:**
- Use Payment Intents API (not deprecated Tokens/Sources)
- Amount in cents
- Include metadata for session tracking

---

### Stripe Webhook Pattern

```typescript
// web/app/api/webhook/stripe/route.ts
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event

  try {
    // CRITICAL: Verify webhook signature to prevent spoofed requests
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const supabase = await createClient()

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const sessionId = paymentIntent.metadata.sessionId
      await supabase
        .from('sessions')
        .update({ status: 'paid' })
        .eq('id', sessionId)
      break

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .upsert({
          stripe_subscription_id: subscription.id,
          user_id: subscription.metadata.userId,
          status: subscription.status,
          plan: subscription.items.data[0]?.price.id,
        })
      break

    case 'customer.subscription.deleted':
      const canceledSub = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', canceledSub.id)
      break
  }

  return new Response('Webhook processed', { status: 200 })
}
```

**Key Points:**
- ALWAYS verify webhook signature (security requirement)
- Use raw body text for signature verification (not parsed JSON)
- Handle relevant event types (payment_intent.succeeded, subscription events)
- Return 200 status to acknowledge receipt

## Requirements

### Functional Requirements

1. **Issue Capture via Chrome Extension**
   - Description: Users can capture their current AI project issue with screenshots, error messages, and context directly from the browser
   - Acceptance: Extension popup allows text description, automatic screenshot capture, and submission to platform

2. **User Registration and Authentication**
   - Description: Users can sign up and log in using email or OAuth (Google) via Supabase Auth
   - Acceptance: Auth flow works, sessions persist, user profiles created

3. **Expert Profile and Vetting**
   - Description: Experts can apply, create profiles with expertise tags, set rates, and availability
   - Acceptance: Expert application form, admin approval workflow, profile page visible to users

4. **Expert Matching**
   - Description: System matches user issues with available experts based on expertise tags
   - Acceptance: User submits issue → receives list of matching available experts with ratings and rates

5. **Session Booking and Payment**
   - Description: Users can book 15-minute sessions with experts and pay via Stripe
   - Acceptance: Select expert → choose time slot → pay ($15-50) → session confirmed

6. **Real-time Chat**
   - Description: Users and experts can chat in real-time during sessions via Socket.io
   - Acceptance: Messages appear instantly, chat history persisted, typing indicators

7. **Screen Sharing**
   - Description: Users can share their screen with experts during sessions via WebRTC
   - Acceptance: One-click screen share, expert sees user's screen in real-time, session timer visible

8. **Session Completion and Rating**
   - Description: Sessions end after 15 minutes with both parties rating the experience
   - Acceptance: Timer countdown, session ends gracefully, rating prompt appears

9. **Subscription Plans**
   - Description: Agencies can subscribe for $99-499/year for bulk sessions
   - Acceptance: Subscription tiers displayed, Stripe subscription checkout works

10. **Expert Earnings Dashboard**
    - Description: Experts see their earnings, pending payouts, and session history
    - Acceptance: Earnings summary, payout request flow (Stripe Connect)

### Edge Cases

1. **Expert Unavailable Mid-Booking** - Show real-time availability updates, handle race conditions with optimistic locking
2. **Payment Failure** - Handle declined cards gracefully, don't create session until payment succeeds
3. **Screen Share Permission Denied** - Show fallback instructions, allow chat-only sessions
4. **Network Disconnect During Session** - Auto-reconnect for Socket.io, pause session timer on disconnect
5. **Session Overrun** - Warn at 2 minutes remaining, auto-end at 15 minutes unless extended
6. **Expert No-Show** - Full refund, report mechanism, temporary suspension for repeated offenses
7. **Safari WebRTC Issues** - Detect browser, show compatibility warning, suggest Chrome

## Implementation Notes

### DO
- Follow the Supabase SSR pattern for Next.js App Router authentication
- Use Socket.io rooms for session-scoped messaging
- Implement webhook signature verification for all Stripe webhooks
- Enable RLS on ALL Supabase tables before going live
- Use minimal Chrome extension permissions to avoid rejection
- Test WebRTC on multiple browsers (Chrome, Firefox, Safari)
- Add TURN server for production WebRTC reliability

### DON'T
- Expose Supabase service role key or Stripe secret key to client
- Use deprecated Stripe Tokens/Sources API (use Payment Intents)
- Skip RLS policies "to save time" - security is non-negotiable
- Use Chrome Extension Manifest V2 (deprecated)
- Assume WebRTC will work without STUN/TURN servers
- Store sensitive data in Chrome extension local storage
- Create persistent background connections in the extension (use service workers)

## Development Environment

### Start Services

```bash
# 1. Start Supabase (local development)
npx supabase start

# 2. Start Next.js web application
cd web && npm run dev

# 3. Build Chrome extension
cd extension && npm run build
# Then load unpacked at chrome://extensions

# 4. Start Stripe webhook listener (local development)
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

### Service URLs
- Web App: http://localhost:3000
- Supabase Studio: http://localhost:54323
- Supabase API: http://localhost:54321

### Required Environment Variables

```bash
# .env.local for web app
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Database Schema

### Tables

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_expert BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expert profiles
CREATE TABLE experts (
  id UUID PRIMARY KEY REFERENCES profiles(id),
  bio TEXT,
  expertise_tags TEXT[] NOT NULL,
  hourly_rate INTEGER NOT NULL, -- in cents
  available BOOLEAN DEFAULT TRUE,
  rating DECIMAL(2,1) DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  stripe_account_id TEXT,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Help requests (from Chrome extension)
CREATE TABLE help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  context JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_request_id UUID REFERENCES help_requests(id),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  expert_id UUID REFERENCES experts(id) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 15,
  status TEXT DEFAULT 'scheduled',
  payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- in cents
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) NOT NULL,
  rater_id UUID REFERENCES profiles(id) NOT NULL,
  ratee_id UUID REFERENCES profiles(id) NOT NULL,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  sessions_remaining INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Success Criteria

The task is complete when:

1. [ ] Chrome extension captures issues with screenshots and sends to platform
2. [ ] Users can register, login, and view their dashboard
3. [ ] Experts can create profiles, set rates, and manage availability
4. [ ] Expert matching returns relevant experts based on expertise tags
5. [ ] Users can book and pay for sessions via Stripe
6. [ ] Real-time chat works during sessions
7. [ ] Screen sharing works during sessions
8. [ ] Sessions end gracefully with rating prompts
9. [ ] Expert earnings are tracked and displayable
10. [ ] No console errors in browser
11. [ ] All Supabase tables have RLS policies enabled
12. [ ] Existing tests still pass
13. [ ] Manual testing verifies end-to-end flow

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Expert matching | `web/__tests__/matching.test.ts` | Returns experts with matching tags, sorted by rating |
| Session pricing | `web/__tests__/pricing.test.ts` | Calculates correct amounts including platform fee |
| Auth middleware | `web/__tests__/middleware.test.ts` | Redirects unauthenticated users |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| User signup flow | web-app ↔ Supabase | User created in auth.users and profiles table |
| Session booking | web-app ↔ Supabase ↔ Stripe | Session created, payment intent created |
| Chat messaging | web-app ↔ Socket.io ↔ Supabase | Messages delivered and persisted |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Complete session | 1. User submits issue 2. Selects expert 3. Pays 4. Joins session 5. Chats 6. Screen shares 7. Rates | Session marked complete, payment captured |
| Expert onboarding | 1. Sign up 2. Apply as expert 3. Set profile 4. Await approval | Expert profile created, not visible until approved |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Landing page | `http://localhost:3000/` | Hero section, CTA buttons, responsive |
| Dashboard | `http://localhost:3000/dashboard` | Shows user's sessions, requires auth |
| Session room | `http://localhost:3000/session/[id]` | Chat works, screen share initiates |
| Expert profile | `http://localhost:3000/expert/[id]` | Shows bio, rate, availability, book button |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| RLS enabled on profiles | `SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles'` | `true` |
| RLS enabled on sessions | `SELECT relrowsecurity FROM pg_class WHERE relname = 'sessions'` | `true` |
| Migration applied | `SELECT * FROM supabase_migrations.schema_migrations` | Shows all migrations |

### Security Verification
| Check | Method | Expected |
|-------|--------|----------|
| Service key not exposed | Search client bundle for `SUPABASE_SERVICE_ROLE_KEY` | Not found |
| Stripe key not exposed | Search client bundle for `sk_` | Not found |
| RLS blocks cross-user access | Try to read another user's sessions via Supabase client | Blocked |
| Webhook signature verified | Send unsigned request to webhook endpoint | 400 error |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (Chrome, Firefox, Safari)
- [ ] Database state verified (RLS enabled, migrations applied)
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns
- [ ] No security vulnerabilities introduced
- [ ] Chrome extension loads without errors
- [ ] Payment flow completes successfully in test mode
- [ ] Screen sharing works on at least Chrome and Firefox
