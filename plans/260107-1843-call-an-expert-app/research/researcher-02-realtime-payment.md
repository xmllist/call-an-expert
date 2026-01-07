# Research Report: Real-Time Communication & Payment Processing for AI Expert Marketplace

**Date:** 2026-01-07
**Researcher:** Claude Code
**Topic:** Technology Stack for Marketplace Platform

---

## Executive Summary

This report evaluates real-time communication, payment processing, database, and authentication technologies for building a marketplace connecting AI project helpers with experts. Key recommendations: **Daily.co** for video/screen sharing (easiest integration, transparent pricing), **Stripe Connect** for payments (marketplace-specific features, global reach), **Supabase** for real-time database + auth (PostgreSQL foundation, excellent DX), and **Clerk** as backup auth option (superior UI components). For expert matching, implement a skill-tagged user triage system with availability status and response time metrics.

---

## 1. Real-Time Video & Screen Sharing

### Daily.co
- **Best for:** Quick MVP, developer-friendly integration
- **Pricing:** Free tier (2,000 min/month), $0.0075/min thereafter
- **Key Features:** Pre-built UI components, room management, recording, screen share
- **Pros:** Easiest SDK (React/Vue/Angular support), excellent docs, no server required
- **Cons:** Limited enterprise features vs competitors
- **Recommended for:** Marketplace MVP with video consultations

### Agora
- **Best for:** High-volume, low-latency applications
- **Pricing:** $0.99-3.99/1,000 min depending on quality
- **Key Features:** Ultra-low latency (<400ms), SDK for web/mobile/desktop, recording, CDN export
- **Pros:** Superior scaling, global infrastructure, interactive whiteboard
- **Cons:** More complex setup, pricing less transparent
- **Recommended for:** High-traffic platforms requiring broadcast features

### Twilio Video
- **Best for:** Enterprise integration with existing Twilio stack
- **Pricing:** $0.0015-$0.004/min (region-dependent)
- **Key Features:** Programmable video, room recordings, SIP interconnect
- **Pros:** Enterprise-grade, extensive documentation, SMS/voice synergy
- **Cons:** Steeper learning curve, infrastructure management required
- **Recommended for:** Enterprises already using Twilio

**Recommendation:** Daily.co for MVP, Agora for scale.

---

## 2. Payment Processing (Marketplace Model)

### Stripe Connect
- **Best for:** Global marketplaces with complex payout requirements
- **Pricing:** 2.9% + $0.30 per transaction; Connect additional 0.25-2% per payout
- **Key Features:**
  - Express/Custom/Standard account types
  - Multi-party payments (customer → platform → expert)
  - Automated payouts, tax reporting (1099-K), dispute handling
  - Support for 135+ currencies
- **Pros:** Marketplaces are core use case, extensive docs, webhooks, Radar fraud detection
- **Cons:** Requires Stripe account creation for experts, compliance overhead
- **Recommended for:** Primary payment solution

### Paddle
- **Best for:** SaaS platforms, especially EU-focused
- **Pricing:** 5% + $0.50 per transaction (includes merchant-of-record)
- **Key Features:**
  - Merchant-of-record model (Paddle handles tax/compliance)
  - Marketplace capabilities, subscription management
  - EU VAT handling included
- **Pros:** Simplified tax compliance, no platform needs tax registration
- **Cons:** Less flexible payout options, limited US presence
- **Recommended for:** EU-focused platforms prioritizing compliance simplicity

**Recommendation:** Stripe Connect for global reach and marketplace maturity.

---

## 3. Database: Real-Time Capabilities

### Supabase
- **Architecture:** PostgreSQL + real-time subscriptions + REST/GraphQL APIs
- **Real-Time Features:** PostgreSQL CDC (Change Data Capture), websockets, presence, broadcast
- **Pricing:** Free tier (500MB DB, 2GB bandwidth), Pro $25/month
- **Pros:** Full SQL access, excellent DX, open-source, Row Level Security (RLS), built-in auth
- **Cons:** Real-time subscriptions have limits on free tier
- **Recommended for:** Primary database + auth solution

### Firebase Realtime Database / Firestore
- **Architecture:** NoSQL document store with real-time listeners
- **Real-Time Features:** Offline sync, listeners on any path, conflict resolution
- **Pricing:** Free tier (1GB storage, 10GB/month transfer), pay-as-you-go
- **Pros:** Excellent offline support, mobile SDKs, Google Cloud integration
- **Cons:** Vendor lock-in, NoSQL learning curve, less flexible queries
- **Recommended for:** Mobile-first or offline-heavy applications

### PostgreSQL with Realtime (via WebSocket)
- **Architecture:** Native PostgreSQL + LISTEN/NOTIFY + pg_notify
- **Real-Time Features:** Full SQL, custom triggers, websocket extensions
- **Pros:** Maximum flexibility, no vendor lock-in, full-text search, JSON support
- **Cons:** Requires more infrastructure management
- **Recommended for:** Teams wanting full PostgreSQL control

**Recommendation:** Supabase for best balance of DX, capabilities, and cost.

---

## 4. Authentication Options

### Supabase Auth
- **Features:** Email/password, OAuth (Google, GitHub, etc.), Magic Link, phone SMS, RLS integration
- **Pricing:** Included with Supabase database
- **Pros:** Tight database integration, open-source, good docs
- **Cons:** Fewer pre-built UI components vs specialized services

### Clerk
- **Features:** Pre-built UI components, React/Next.js SDKs, multi-factor auth, user management dashboard
- **Pricing:** Free tier (10,000 monthly active users), Pro $25/month
- **Pros:** Best developer experience, beautiful components, user impersonation
- **Cons:** Vendor lock-in, pricing tiers can escalate
- **Recommended for:** React/Next.js projects prioritizing DX

### Auth0
- **Features:** Enterprise SSO, RBAC, MFA, rules/hooks, 70+ integrations
- **Pricing:** Free (7,000 users), $23-80/month for additional features
- **Pros:** Enterprise features, extensive integrations, audit logs
- **Cons:** Complex pricing, enterprise focus may be overkill for MVP
- **Recommended for:** Enterprise requirements

**Recommendation:** Start with **Supabase Auth** (included, sufficient features), upgrade to **Clerk** if premium UI components become critical.

---

## 5. Expert Matching & User Triage Systems

### Matching Algorithm Components
- **Expert Profiles:** Skills tags (React, Python, AI/ML), experience level, hourly rate, availability status, response time metrics
- **Triage Logic:**
  1. Skill matching (required vs preferred tags)
  2. Availability filtering (online now vs scheduled)
  3. Response time ranking (avg < 2 hours preferred)
  4. Budget matching (customer range vs expert rate)
  5. Rating/review sorting (4.5+ threshold)

### Real-Time Status Tracking
- Use Supabase Realtime to track:
  - Online/offline status (presence system)
  - In-session indicators
  - Availability calendar sync

### Implementation Pattern
```
User Request → Filter by skills → Filter by availability → Rank by response time/score → Present top 5 matches with estimated wait time
```

---

## 6. Recommended Technology Stack

| Category | Recommended | Alternative |
|----------|-------------|-------------|
| Video/Screen Share | Daily.co | Agora |
| Payment Processing | Stripe Connect | Paddle |
| Database + Realtime | Supabase | Firebase |
| Authentication | Supabase Auth | Clerk |
| Matching Logic | Custom (PostgreSQL) | Algolia (search) |

---

## 7. Implementation Quick Start

### Daily.co Integration
```javascript
import DailyIframe from '@daily-co/daily-js';

const callFrame = DailyIframe.createFrame(element, {
  url: 'https://your-domain.daily.co/room-name',
  showLeaveButton: true,
  iframeStyle: { width: '100%', height: '100%', border: '0' }
});

callFrame.join();
callFrame.startScreenShare();
```

### Supabase Realtime Subscription
```javascript
const channel = supabase
  .channel('experts-online')
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    updateOnlineExperts(Object.keys(state));
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: currentUser.id });
    }
  });
```

### Stripe Connect Express Flow
```javascript
// Create connected account
const account = await stripe.accounts.create({
  type: 'express',
  metadata: { expert_id: expertId }
});

// Create account link for onboarding
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'https://yoursite.com/reauth',
  return_url: 'https://yoursite.com/dashboard',
  type: 'account_onboarding'
});
```

---

## 8. Cost Estimation (Monthly, 1,000 users)

| Service | Free Tier | Cost at Scale |
|---------|-----------|---------------|
| Daily.co | 2,000 min | ~$150/month (20,000 min) |
| Stripe Connect | 2.9% + $0.30 | ~$4,000/month ($100K GMV) |
| Supabase | 500MB DB | $25/month (Pro tier) |
| **Total** | - | **~$4,175/month** |

---

## 9. Security Considerations

- **Payments:** Use Stripe Connect's built-in fraud detection (Radar), implement 3D Secure for high-value transactions
- **Video:** Enable waiting rooms, record sessions with consent, use room tokens with expiration
- **Database:** Enable Row Level Security (RLS) policies in Supabase, encrypt sensitive fields
- **Auth:** Implement rate limiting, enable MFA for expert accounts, use session timeouts

---

## 10. Unresolved Questions

1. What geographic markets will the platform serve first? (Impacts Paddle vs Stripe choice)
2. What is the expected session duration per expert consultation? (Impacts video pricing)
3. Do experts need subscription/recurring payment options or just per-session?
4. What compliance requirements (HIPAA, SOC2) apply to AI consulting sessions?
5. Should matching consider real-time queue length vs. estimated wait time?

---

## Sources

- [Daily.co Pricing](https://daily.co/pricing)
- [Agora Pricing](https://www.agora.io/en/video-calling-pricing/)
- [Twilio Video Pricing](https://www.twilio.com/en-us/video/pricing)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Paddle Marketplace](https://www.paddle.com/marketplaces)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Clerk Documentation](https://clerk.com/docs)
