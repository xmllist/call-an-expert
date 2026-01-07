-- ============================================
-- SEED DATA
-- Phase 02: Supabase Backend Setup
-- ============================================

-- Note: Auth users are created separately via Supabase Auth
-- These are sample UUIDs - replace with actual auth user IDs in production

-- ============================================
-- SAMPLE USERS (auth.users must exist first)
-- ============================================

-- Sample client user
INSERT INTO profiles (id, auth_user_id, email, full_name, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'client@example.com',
  'Alice Client',
  'client'
);

-- Sample expert users
INSERT INTO profiles (id, auth_user_id, email, full_name, role)
VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'expert1@example.com',
    'Bob Expert - Cursor & AI',
    'expert'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'expert2@example.com',
    'Carol Expert - Full Stack',
    'expert'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    'expert3@example.com',
    'Dave Expert - DevOps',
    'expert'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '55555555-5555-5555-5555-555555555555',
    'expert4@example.com',
    'Eve Expert - React & Next.js',
    'expert'
  );

-- Sample agency admin
INSERT INTO profiles (id, auth_user_id, email, full_name, role)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '66666666-6666-6666-6666-666666666666',
  'agency@example.com',
  'Frank Agency Admin',
  'agency_admin'
);

-- ============================================
-- EXPERT PROFILES
-- ============================================

-- Expert 1: AI & Cursor specialist
INSERT INTO expert_profiles (id, user_id, bio, hourly_rate_cents, years_experience, is_available, rating, total_sessions)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  '22222222-2222-2222-2222-222222222222',
  'AI-powered development expert specializing in Cursor IDE, v0, and Lovable. 5+ years helping developers integrate AI tools into their workflow.',
  15000, -- $150/hour
  8,
  true,
  4.90,
  47
);

-- Expert 2: Full Stack developer
INSERT INTO expert_profiles (id, user_id, bio, hourly_rate_cents, years_experience, is_available, rating, total_sessions)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  '33333333-3333-3333-3333-333333333333',
  'Full-stack developer with expertise in React, Vue, Next.js, and Python. Helping startups ship faster.',
  12000, -- $120/hour
  6,
  true,
  4.85,
  32
);

-- Expert 3: DevOps specialist
INSERT INTO expert_profiles (id, user_id, bio, hourly_rate_cents, years_experience, is_available, rating, total_sessions)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  '44444444-4444-4444-4444-444444444444',
  'DevOps engineer specializing in cloud infrastructure, CI/CD, and container orchestration. AWS certified.',
  14000, -- $140/hour
  7,
  true,
  4.75,
  28
);

-- Expert 4: React specialist
INSERT INTO expert_profiles (id, user_id, bio, hourly_rate_cents, years_experience, is_available, rating, total_sessions)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '55555555-5555-5555-5555-555555555555',
  'React and Next.js specialist. Helping teams build performant, accessible UIs. Author of several open-source components.',
  13000, -- $130/hour
  5,
  true,
  4.95,
  61
);

-- ============================================
-- AGENCY PROFILES
-- ============================================

INSERT INTO agency_profiles (id, user_id, company_name, subscription_plan, seats_allocated, seats_used)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '66666666-6666-6666-6666-666666666666',
  'TechFlow Agency',
  'pro',
  10,
  3
);

-- ============================================
-- EXPERT SKILLS
-- ============================================

-- Expert 1 skills (AI specialist)
INSERT INTO expert_skills (expert_id, skill_category_id, proficiency_level)
SELECT
  '77777777-7777-7777-7777-777777777777',
  id,
  CASE slug
    WHEN 'cursor' THEN 5
    WHEN 'v0' THEN 5
    WHEN 'lovable' THEN 5
    WHEN 'ai-ml' THEN 4
    WHEN 'react' THEN 3
    ELSE 3
  END
FROM skill_categories
WHERE slug IN ('cursor', 'v0', 'lovable', 'ai-ml', 'react');

-- Expert 2 skills (Full Stack)
INSERT INTO expert_skills (expert_id, skill_category_id, proficiency_level)
SELECT
  '88888888-8888-8888-8888-888888888888',
  id,
  CASE slug
    WHEN 'react' THEN 5
    WHEN 'vuejs' THEN 5
    WHEN 'nextjs' THEN 5
    WHEN 'python' THEN 4
    WHEN 'web-dev' THEN 4
    ELSE 3
  END
FROM skill_categories
WHERE slug IN ('react', 'vuejs', 'nextjs', 'python', 'web-dev');

-- Expert 3 skills (DevOps)
INSERT INTO expert_skills (expert_id, skill_category_id, proficiency_level)
SELECT
  '99999999-9999-9999-9999-999999999999',
  id,
  CASE slug
    WHEN 'devops-cloud' THEN 5
    WHEN 'db-backend' THEN 4
    WHEN 'web-dev' THEN 3
    ELSE 3
  END
FROM skill_categories
WHERE slug IN ('devops-cloud', 'db-backend', 'web-dev');

-- Expert 4 skills (React specialist)
INSERT INTO expert_skills (expert_id, skill_category_id, proficiency_level)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  id,
  CASE slug
    WHEN 'react' THEN 5
    WHEN 'nextjs' THEN 5
    WHEN 'typescript' THEN 5
    WHEN 'web-dev' THEN 4
    ELSE 3
  END
FROM skill_categories
WHERE slug IN ('react', 'nextjs', 'typescript', 'web-dev');

-- ============================================
-- AVAILABILITY SLOTS
-- ============================================

-- Expert 1 availability (AI specialist)
INSERT INTO availability_slots (expert_id, day_of_week, start_time, end_time, is_available)
VALUES
  ('77777777-7777-7777-7777-777777777777', 1, '09:00', '17:00', true),
  ('77777777-7777-7777-7777-777777777777', 2, '09:00', '17:00', true),
  ('77777777-7777-7777-7777-777777777777', 3, '09:00', '17:00', true),
  ('77777777-7777-7777-7777-777777777777', 4, '09:00', '17:00', true),
  ('77777777-7777-7777-7777-777777777777', 5, '09:00', '15:00', true);

-- Expert 2 availability (Full Stack)
INSERT INTO availability_slots (expert_id, day_of_week, start_time, end_time, is_available)
VALUES
  ('88888888-8888-8888-8888-888888888888', 1, '10:00', '18:00', true),
  ('88888888-8888-8888-8888-888888888888', 2, '10:00', '18:00', true),
  ('88888888-8888-8888-8888-888888888888', 3, '10:00', '18:00', true),
  ('88888888-8888-8888-8888-888888888888', 4, '10:00', '18:00', true),
  ('88888888-8888-8888-8888-888888888888', 5, '10:00', '16:00', true);

-- Expert 3 availability (DevOps)
INSERT INTO availability_slots (expert_id, day_of_week, start_time, end_time, is_available)
VALUES
  ('99999999-9999-9999-9999-999999999999', 1, '08:00', '16:00', true),
  ('99999999-9999-9999-9999-999999999999', 2, '08:00', '16:00', true),
  ('99999999-9999-9999-9999-999999999999', 3, '08:00', '16:00', true),
  ('99999999-9999-9999-9999-999999999999', 4, '08:00', '16:00', true);

-- Expert 4 availability (React)
INSERT INTO availability_slots (expert_id, day_of_week, start_time, end_time, is_available)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, '09:00', '18:00', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, '09:00', '18:00', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, '09:00', '18:00', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, '09:00', '18:00', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, '09:00', '14:00', true);

-- ============================================
-- ONLINE STATUS
-- ============================================

INSERT INTO online_status (user_id, is_online, last_seen_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', false, NOW()),
  ('22222222-2222-2222-2222-222222222222', true, NOW()),
  ('33333333-3333-3333-3333-333333333333', true, NOW()),
  ('44444444-4444-4444-4444-444444444444', false, NOW() - INTERVAL '30 minutes'),
  ('55555555-5555-5555-5555-555555555555', true, NOW()),
  ('66666666-6666-6666-6666-666666666666', false, NOW());

-- ============================================
-- SAMPLE SESSIONS (for testing)
-- ============================================

-- Completed session
INSERT INTO sessions (client_id, expert_id, topic, duration_minutes, session_rate_cents, total_amount_cents, commission_amount_cents, expert_payout_cents, status, scheduled_start, actual_start, actual_end, client_rating)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '77777777-7777-7777-7777-777777777777',
  'Cursor IDE setup and AI integration help',
  60, -- 1 hour minimum
  15000, -- $150/hour
  15000,
  1500, -- 10% commission
  13500, -- 90% to expert
  'completed',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days' + INTERVAL '1 hour',
  NOW() - INTERVAL '2 days' + INTERVAL '2 hours',
  5
);

-- In-progress session
INSERT INTO sessions (client_id, expert_id, topic, duration_minutes, session_rate_cents, total_amount_cents, commission_amount_cents, expert_payout_cents, status, scheduled_start)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '88888888-8888-8888-8888-888888888888',
  'React component debugging',
  60, -- 1 hour minimum
  12000, -- $120/hour
  12000,
  1200, -- 10% commission
  10800, -- 90% to expert
  'in_progress',
  NOW()
);

-- Requested session
INSERT INTO sessions (client_id, expert_id, topic, duration_minutes, session_rate_cents, total_amount_cents, commission_amount_cents, expert_payout_cents, status, scheduled_start)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Next.js performance optimization',
  60, -- 1 hour minimum
  13000, -- $130/hour
  13000,
  1300, -- 10% commission
  11700, -- 90% to expert
  'requested',
  NOW() + INTERVAL '1 day'
);

-- ============================================
-- SAMPLE MATCH REQUEST
-- ============================================

INSERT INTO match_requests (client_id, required_skills, topic, description, preferred_duration_minutes, max_rate_cents)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  ARRAY[
    (SELECT id FROM skill_categories WHERE slug = 'cursor'),
    (SELECT id FROM skill_categories WHERE slug = 'ai-ml')
  ]::UUID[],
  'AI code generation help',
  'I need help setting up Cursor IDE with custom rules for my React project',
  60,
  20000
);
