---
title: "Call-an-Expert Implementation Plan"
description: "Chrome extension + web platform for AI hobbyists to connect with experts"
status: validated
priority: P1
effort: 120h
branch: v0.1.wf
tags: [chrome-extension, supabase, daily-co, stripe, nextjs]
created: 2026-01-07
validated: 2026-01-07
phase_01_completed: 2026-01-07
---

# Call-an-Expert Implementation Plan

## Product Overview

| Aspect | Details |
|--------|---------|
| Product | Chrome extension + web platform |
| Target Users | AI hobbyists/agency staff stuck at 80% completion |
| Solution | 1-hour minimum expert screen-share sessions |
| Pricing | Per-session + agency subscription ($99-499/year), 10% commission |

## Validation Summary

**Validated:** 2026-01-07

### Confirmed Decisions
- **Code Capture**: DOM scraping only (simple, reliable)
- **Expert Matching**: Manual skill selection by user
- **Pricing Model**: Hybrid (per-session + agency subscription)
- **Session Duration**: 1 hour minimum

### Action Items
- [x] Update session rate calculations for 1-hour minimum
- [x] Adjust Daily.co integration for 60-min sessions
- [x] Phase 02: Update session_rate to reflect 1-hour pricing

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Extension Framework | WXT + TypeScript | Chrome extension with Manifest V3 |
| Backend | Supabase (PostgreSQL + Auth) | Database, realtime, authentication |
| Video | Daily.co | Video calls + screen sharing |
| Payments | Stripe Connect (Express) | Marketplace payments with payouts |
| Frontend | Next.js 14 + React | Web dashboard for users/experts |

## Dependency Graph

```
Phase 01: Chrome Extension Foundation
    └── Phase 04: Real-time Integration (depends on extension code capture)

Phase 02: Supabase Backend Setup
    ├── Phase 04: Real-time Integration (depends on DB schema)
    └── Phase 05: Payment Integration (depends on user/expert tables)

Phase 03: Frontend Dashboard (standalone - can run in parallel)
    └── Phase 04: Real-time Integration (depends on frontend UI)

Phase 04: Real-time Integration
    └── Phase 06: Integration Tests (final integration)

Phase 05: Payment Integration
    └── Phase 06: Integration Tests (final integration)

Phase 06: Integration Tests & Deployment
    └── END
```

## Phase Independence Matrix

| Phase | Can Run In Parallel With | Blocking Dependencies |
|-------|--------------------------|----------------------|
| 01: Extension | 02, 03 | None |
| 02: Backend | 01, 03 | None |
| 03: Frontend | 01, 02 | None |
| 04: Realtime | 01, 02, 03 | 02 (DB schema) |
| 05: Payments | 01, 02, 03 | 02 (DB schema) |
| 06: Integration | 04, 05 | 04, 05 |

## Execution Strategy

### Wave 1 (Weeks 1-2) - Foundation
- **Phase 01**: Chrome extension skeleton + code capture
- **Phase 02**: Supabase schema + auth setup
- **Phase 03**: Frontend dashboard (UI only, no auth yet)

### Wave 2 (Weeks 3-4) - Integration
- **Phase 04**: Real-time features (Daily.co + Supabase Realtime)
- **Phase 05**: Stripe Connect payments

### Wave 3 (Week 5) - Testing & Deployment
- **Phase 06**: Integration tests + deployment pipeline

## Phase Status

| Phase | Status | Completed | Files Changed |
|-------|--------|-----------|---------------|
| Phase 01: Extension Foundation | ✅ done | 2026-01-07 | package.json, entrypoint.config.ts, tsconfig.json, vite-env.d.ts, src/content/capture.ts, src/background/service-worker.ts, src/popup/App.vue, src/popup/main.ts, src/utils/message.ts, src/utils/storage.ts, src/types/index.ts, src/test-setup.ts, vitest.config.ts |
| Phase 02: Backend Setup | ✅ done | 2026-01-07 | config.toml, schema/schema.sql, schema/schema.test.sql, functions/find_matching_experts.sql, functions/create_session.sql, policies/rls-policies.sql, seed/seed.sql, README.md |
| Phase 03: Frontend Dashboard | ✅ done | 2026-01-08 | web/app/*, web/components/*, web/hooks/*, web/lib/* |
| Phase 04: Real-time Integration | ✅ done | 2026-01-08 | integrations/daily/*, integrations/realtime/*, integrations/webhooks/* |
| Phase 05: Payment Integration | ✅ done | 2026-01-08 | integrations/stripe/* |
| Phase 06: Integration Tests | ⏳ pending | - | - |

## File Ownership (No Overlap)

```
/extensions/           ← Phase 01
  /src/
    /content/         # content scripts
    /popup/           # popup UI
    /background/      # service worker
/supabase/             ← Phase 02
  /schema/
  /functions/
  /policies/
/web/                   ← Phase 03
  /app/
  /components/
  /hooks/
  /lib/
/integrations/          ← Phase 04 + 05
  /daily/               # Daily.co video
  /realtime/            # Supabase realtime
  /stripe/              # Stripe payments
  /webhooks/            # Webhook handlers
/shared/                ← Phase 01 + 02 (types only, no overlap)
  /types/
```

## Unresolved Questions

1. Which AI IDEs (Cursor, Replit, v0, Lovable) expose code via DOM vs require injection?
2. Do these platforms have official extension policies/restrictions?
3. What geographic markets first? (Impacts Stripe vs Paddle)
4. Expert onboarding model (self-service vs verified)?
