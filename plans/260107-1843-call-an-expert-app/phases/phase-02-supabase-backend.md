---
title: "Phase 02: Supabase Backend Setup"
description: "Database schema, RLS policies, and edge functions for Call-an-Expert"
status: completed
priority: P1
effort: 20h
branch: v0.1.wf
created: 2026-01-07
completed: 2026-01-07
---

# Phase 02: Supabase Backend Setup

## Summary

✅ Completed Supabase backend setup with database schema, RLS policies, edge functions, and seed data.

## Deliverables

| Deliverable | File | Status |
|-------------|------|--------|
| Schema | `supabase/schema/schema.sql` | ✅ |
| RLS Policies | `supabase/policies/rls-policies.sql` | ✅ |
| Edge Functions | `supabase/functions/*.sql` | ✅ |
| Seed Data | `supabase/seed/seed.sql` | ✅ |
| Tests | `supabase/schema/schema.test.sql` | ✅ |
| Documentation | `supabase/README.md` | ✅ |
| Config | `supabase/config.toml` | ✅ |

## Schema Highlights

### Core Tables (10 tables)
- `profiles` - User accounts linked to auth.users
- `expert_profiles` - Expert data with rates (1-hour minimum)
- `agency_profiles` - Agency subscriptions
- `sessions` - 1-hour minimum sessions
- `session_messages` - Chat during sessions
- `availability_slots` - Expert schedules
- `payments` - Stripe payment records
- `match_requests` - Client matching requests
- `match_results` - Expert matches
- `online_status` - Real-time presence

### Key Features
- **Session minimum**: 60 minutes enforced
- **Commission**: 10% platform fee
- **Rating system**: 1-5 stars
- **Skills**: Normalized categories with proficiency levels

## RLS Policies

### Read Access (Public)
- Expert profiles visible for discovery
- Skill categories viewable
- Online status visible

### Read Access (Authenticated)
- Own profile and sessions
- Payments for own sessions

### Write Access
- Users manage own profiles
- Experts manage own skills/availability
- Clients create sessions
- Clients cancel with refund calculation

## Edge Functions

### find_matching_experts
- Skill-based matching with scoring
- Rate filtering
- Availability consideration

### create_session
- Amount calculation (1-hour minimum)
- Daily.co room creation
- Status transitions

### cancel_session
- Refund calculation (100% > 24h, 50% otherwise)
- Authorization checks

## Seed Data

- 1 client user
- 4 expert users (AI, Full Stack, DevOps, React)
- 1 agency admin
- Skill categories (cursor, v0, lovable, react, etc.)
- Availability slots for each expert
- 3 sample sessions (completed, in-progress, requested)

## Testing

Run tests with:
```bash
psql -f schema/schema.test.sql
```

Tests verify:
- Commission calculations (10% platform fee)
- Session minimum duration constraint
- Rating range validation
- Expert matching function
- Session creation
- Status updates
- Cancellation with refunds

## Files Changed

```
supabase/
├── config.toml           (new - 2462 bytes)
├── README.md             (new - documentation)
├── schema/
│   ├── schema.sql        (new - 10 tables, functions)
│   └── schema.test.sql   (new - validation tests)
├── functions/
│   ├── find_matching_experts.sql  (new)
│   └── create_session.sql         (new)
├── policies/
│   └── rls-policies.sql   (new)
└── seed/
    └── seed.sql           (new)
```

## Success Criteria - All Met

- ✅ All tables created without errors
- ✅ RLS policies restrict access correctly
- ✅ Auth helper functions created
- ✅ Edge functions compile without errors
- ✅ Seed data inserts successfully
- ✅ No file overlap with other phases
