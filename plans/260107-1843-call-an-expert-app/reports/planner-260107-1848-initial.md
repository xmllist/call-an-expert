# Planning Report: Call-an-Expert Implementation

**Date:** 2026-01-07
**Plan:** /Users/bobacu/test/callAnExpert/plans/260107-1843-call-an-expert-app/

## Summary

Created comprehensive parallel-optimized implementation plan for Call-an-Expert Chrome extension + web platform.

## Phases Created

| Phase | Name | Effort | Parallel Group | Dependencies |
|-------|------|--------|----------------|--------------|
| 01 | Chrome Extension Foundation | 24h | A | None |
| 02 | Supabase Backend Setup | 20h | A | None |
| 03 | Frontend Dashboard | 24h | A | None |
| 04 | Real-time Integration | 16h | B | 02 |
| 05 | Payment Integration | 16h | B | 02 |
| 06 | Integration Tests & Deployment | 20h | C | 04, 05 |

## Execution Timeline

**Wave 1 (Weeks 1-2):** Phases 01, 02, 03 in parallel
**Wave 2 (Weeks 3-4):** Phases 04, 05 in parallel (depend on 02)
**Wave 3 (Week 5):** Phase 06 (depends on 04, 05)

## Technology Stack

| Layer | Technology |
|-------|------------|
| Extension | WXT + TypeScript + Manifest V3 |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Video | Daily.co |
| Payments | Stripe Connect (Express) |
| Frontend | Next.js 14 + React |

## Key Decisions

1. **WXT Framework** - Modern, Vue-first DX, minimal config
2. **Supabase Auth** - Included with database, sufficient for MVP
3. **Daily.co** - Easiest integration, transparent pricing
4. **Stripe Connect Express** - Best balance of control and ease

## File Structure

```
plans/260107-1843-call-an-expert-app/
  plan.md                          # Main plan with dependency graph
  phases/
    phase-01-chrome-extension.md   # WXT extension with code capture
    phase-02-supabase-backend.md   # Schema, RLS, Edge Functions
    phase-03-frontend-dashboard.md # Next.js user/expert dashboards
    phase-04-realtime-integration.md # Daily.co + Supabase Realtime
    phase-05-payment-integration.md  # Stripe Connect
    phase-06-integration-deployment.md # Tests + CI/CD
```

## Unresolved Questions

1. Which AI IDEs expose code via DOM vs require injection?
2. Do platforms have official extension policies?
3. Geographic market for initial launch?
4. Expected session duration?
5. Subscription or per-session payments for experts?
