# Call-an-Expert Supabase Setup

## Phase 02: Supabase Backend Setup

This directory contains all Supabase configuration for the Call-an-Expert platform.

## Directory Structure

```
supabase/
├── config.toml           # Supabase local development config
├── schema/
│   ├── schema.sql        # Database schema (tables, enums, functions)
│   └── schema.test.sql   # Schema validation tests
├── functions/
│   ├── find_matching_experts.sql  # Expert matching logic
│   └── create_session.sql         # Session creation & management
├── policies/
│   └── rls-policies.sql  # Row Level Security policies
└── seed/
    └── seed.sql          # Sample data for development
```

## Quick Start

### 1. Initialize Supabase

```bash
# Start Supabase locally
supabase start

# Or link to remote project
supabase link --project-ref <project-ref>
```

### 2. Apply Schema

```bash
# Apply schema
supabase db push

# Or run migrations
supabase migration up
```

### 3. Apply RLS Policies

```bash
# RLS policies are included in schema.sql
# If separate, apply manually:
psql -f policies/rls-policies.sql
```

### 4. Seed Test Data

```bash
supabase db reset --seed
```

## Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User accounts linked to auth.users |
| `expert_profiles` | Expert-specific data (rates, rating) |
| `agency_profiles` | Agency subscription data |
| `sessions` | 1-hour minimum sessions |
| `session_messages` | Real-time chat during sessions |
| `availability_slots` | Expert availability schedules |
| `payments` | Stripe payment records |
| `match_requests` | Client matching requests |
| `match_results` | Expert matches |
| `online_status` | Real-time online indicators |

### Key Constraints

- **Session minimum**: 60 minutes (`duration_minutes >= 60`)
- **Commission**: 10% platform fee
- **Rating range**: 1-5 stars

### Payment Flow

```
Session ($100/hr × 1hr) = $100 total
├── Platform (10%) = $10
└── Expert (90%) = $90
```

## Environment Variables

Create `.env` based on `.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
DAILY_API_KEY=xxx
```

## Testing

Run schema tests:

```bash
psql -f schema/schema.test.sql
```

Expected output:
- All tests should pass with "PASS" messages
- Verify commission calculations are correct
- Confirm RLS policies are active

## Deployment

### Supabase CLI

```bash
# Deploy to remote
supabase db push

# Deploy functions
supabase functions deploy
```

### Manual Deployment

1. Apply schema in Supabase SQL Editor
2. Apply RLS policies
3. Deploy Edge Functions via Dashboard
4. Configure environment variables
5. Set up Stripe webhooks

## Edge Functions

### find_matching_experts

Finds available experts matching skill requirements.

```sql
SELECT * FROM find_matching_experts(
  ARRAY[(SELECT id FROM skill_categories WHERE slug = 'cursor')]::UUID[],
  20000, -- max rate in cents ($200)
  10     -- limit results
);
```

### create_session

Creates a new session with calculated amounts.

```sql
SELECT * FROM create_session(
  'client-profile-id',
  'expert-profile-id',
  'Help with Cursor IDE setup',
  60, -- duration in minutes (minimum 60)
  'Additional notes',
  NOW() + INTERVAL '1 day'
);
```

## RLS Policies

### Read Access
- `profiles`: Public (for expert discovery)
- `expert_profiles`: Public (for expert discovery)
- `sessions`: Owner only (client or expert)
- `payments`: Owner only (client or expert)

### Write Access
- `profiles`: Self only
- `expert_profiles`: Expert only
- `sessions`: Client (create), Expert (status updates)
- `availability_slots`: Expert only

## Security Notes

- RLS policies enforce data access control
- Service role key bypasses RLS (use carefully)
- Auth trigger creates profile on signup
- Profile ID is `auth_user_id` linked to `profiles`
