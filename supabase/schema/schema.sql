-- Call-an-Expert Database Schema
-- Phase 02: Supabase Backend Setup
-- Session minimum: 1 hour

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('client', 'expert', 'agency_admin');
CREATE TYPE session_status AS ENUM ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE payment_type AS ENUM ('session', 'subscription', 'refund', 'payout');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- ============================================
-- PROFILES (linked to auth.users)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT email_not_empty CHECK (LENGTH(TRIM(email)) > 0)
);

-- Index for auth lookups
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================
-- EXPERT PROFILES
-- ============================================

CREATE TABLE expert_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  hourly_rate_cents INTEGER NOT NULL DEFAULT 10000, -- $100.00 default, 1-hour minimum
  currency TEXT NOT NULL DEFAULT 'USD',
  years_experience INTEGER,
  is_available BOOLEAN NOT NULL DEFAULT true,
  rating DECIMAL(3, 2) DEFAULT 0, -- 0.00 to 5.00
  total_sessions INTEGER DEFAULT 0,
  total_hours NUMERIC(5, 1) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT hourly_rate_positive CHECK (hourly_rate_cents > 0),
  CONSTRAINT rating_range CHECK (rating >= 0 AND rating <= 5)
);

CREATE INDEX idx_expert_profiles_user_id ON expert_profiles(user_id);
CREATE INDEX idx_expert_profiles_available ON expert_profiles(is_available);
CREATE INDEX idx_expert_profiles_rate ON expert_profiles(hourly_rate_cents);
CREATE INDEX idx_expert_profiles_rating ON expert_profiles(rating DESC);

-- ============================================
-- EXPERT SKILLS (normalized)
-- ============================================

CREATE TABLE skill_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES skill_categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expert_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  skill_category_id UUID NOT NULL REFERENCES skill_categories(id),
  proficiency_level INTEGER NOT NULL DEFAULT 3 CHECK (proficiency_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(expert_id, skill_category_id)
);

CREATE INDEX idx_expert_skills_expert_id ON expert_skills(expert_id);
CREATE INDEX idx_expert_skills_skill_category_id ON expert_skills(skill_category_id);

-- ============================================
-- AGENCY PROFILES
-- ============================================

CREATE TABLE agency_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  subscription_plan TEXT NOT NULL DEFAULT 'basic', -- basic, pro, enterprise
  subscription_status TEXT NOT NULL DEFAULT 'active',
  seats_allocated INTEGER NOT NULL DEFAULT 5,
  seats_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT seats_positive CHECK (seats_allocated > 0),
  CONSTRAINT seats_used_check CHECK (seats_used >= 0 AND seats_used <= seats_allocated)
);

CREATE INDEX idx_agency_profiles_user_id ON agency_profiles(user_id);
CREATE INDEX idx_agency_profiles_subscription ON agency_profiles(subscription_status);

-- ============================================
-- SESSIONS (1-hour minimum)
-- ============================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  expert_id UUID NOT NULL REFERENCES expert_profiles(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 60, -- 1-hour minimum
  session_rate_cents INTEGER NOT NULL, -- Calculated from expert's hourly_rate
  total_amount_cents INTEGER NOT NULL, -- session_rate_cents * duration_hours
  commission_amount_cents INTEGER NOT NULL, -- 10% platform commission
  expert_payout_cents INTEGER NOT NULL, -- 90% to expert
  status session_status NOT NULL DEFAULT 'requested',
  topic TEXT NOT NULL,
  notes TEXT,
  daily_room_url TEXT,
  daily_room_name TEXT,
  client_feedback TEXT,
  client_rating INTEGER, -- 1-5
  expert_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT duration_minimum CHECK (duration_minutes >= 60),
  CONSTRAINT rating_range_session CHECK (client_rating IS NULL OR (client_rating >= 1 AND client_rating <= 5))
);

CREATE INDEX idx_sessions_client_id ON sessions(client_id);
CREATE INDEX idx_sessions_expert_id ON sessions(expert_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_start);
CREATE INDEX idx_sessions_created ON sessions(created_at);

-- ============================================
-- SESSION MESSAGES
-- ============================================

CREATE TABLE session_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message_type TEXT NOT NULL DEFAULT 'text', -- text, file, system
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX idx_session_messages_sender ON session_messages(sender_id);
CREATE INDEX idx_session_messages_created ON session_messages(created_at);

-- ============================================
-- AVAILABILITY SLOTS
-- ============================================

CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT time_order CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_slots_expert_id ON availability_slots(expert_id);
CREATE INDEX idx_availability_slots_available ON availability_slots(is_available);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  expert_id UUID REFERENCES expert_profiles(id),
  amount_cents INTEGER NOT NULL,
  commission_amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_type payment_type NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  platform_fee_percentage DECIMAL(4, 2) DEFAULT 10.00,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_session_id ON payments(session_id);
CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_expert_id ON payments(expert_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);

-- ============================================
-- MATCH REQUESTS
-- ============================================

CREATE TABLE match_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  required_skills TEXT[] NOT NULL, -- Array of skill category IDs
  topic TEXT NOT NULL,
  description TEXT,
  preferred_duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_rate_cents INTEGER, -- Maximum hourly rate willing to pay
  status request_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_requests_client_id ON match_requests(client_id);
CREATE INDEX idx_match_requests_status ON match_requests(status);
CREATE INDEX idx_match_requests_created ON match_requests(created_at);

-- ============================================
-- MATCH RESULTS (experts matched to request)
-- ============================================

CREATE TABLE match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES match_requests(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  match_score DECIMAL(5, 2), -- Calculated match score
  is_notified BOOLEAN NOT NULL DEFAULT false,
  is_accepted BOOLEAN,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(request_id, expert_id)
);

CREATE INDEX idx_match_results_request_id ON match_results(request_id);
CREATE INDEX idx_match_results_expert_id ON match_results(expert_id);

-- ============================================
-- ONLINE STATUS (realtime)
-- ============================================

CREATE TABLE online_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_room_id UUID
);

CREATE INDEX idx_online_status_user_id ON online_status(user_id);
CREATE INDEX idx_online_status_online ON online_status(is_online);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_profiles_updated_at BEFORE UPDATE ON expert_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_profiles_updated_at BEFORE UPDATE ON agency_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_requests_updated_at BEFORE UPDATE ON match_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate session amounts (1-hour minimum enforced at application level)
CREATE OR REPLACE FUNCTION calculate_session_amounts(
  p_hourly_rate_cents INTEGER,
  p_duration_minutes INTEGER
)
RETURNS TABLE (
  session_rate_cents INTEGER,
  total_amount_cents INTEGER,
  commission_amount_cents INTEGER,
  expert_payout_cents INTEGER
) AS $$
BEGIN
  -- session_rate is the hourly rate
  session_rate_cents := p_hourly_rate_cents;

  -- total = hourly_rate * (duration_hours)
  total_amount_cents := p_hourly_rate_cents * (p_duration_minutes / 60.0);

  -- commission = 10% of total
  commission_amount_cents := ROUND(total_amount_cents * 0.10);

  -- expert payout = 90% of total
  expert_payout_cents := total_amount_cents - commission_amount_cents;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Get expert's availability for a given date
CREATE OR REPLACE FUNCTION get_expert_availability(
  p_expert_id UUID,
  p_date DATE
)
RETURNS TABLE (
  slot_id UUID,
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.day_of_week,
    a.start_time,
    a.end_time,
    a.is_available
  FROM availability_slots a
  WHERE a.expert_id = p_expert_id
    AND a.is_available = true
    AND a.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update expert statistics after session
CREATE OR REPLACE FUNCTION update_expert_stats(p_expert_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE expert_profiles
  SET
    total_sessions = (
      SELECT COUNT(*) FROM sessions s
      WHERE s.expert_id = p_expert_id AND s.status = 'completed'
    ),
    total_hours = COALESCE((
      SELECT SUM(duration_minutes) / 60.0 FROM sessions s
      WHERE s.expert_id = p_expert_id AND s.status = 'completed'
    ), 0),
    rating = COALESCE((
      SELECT AVG(client_rating)::DECIMAL(3, 2) FROM sessions s
      WHERE s.expert_id = p_expert_id AND s.status = 'completed' AND client_rating IS NOT NULL
    ), 0)
  WHERE id = p_expert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_skills ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default skill categories
INSERT INTO skill_categories (name, slug, parent_id) VALUES
  ('AI & Machine Learning', 'ai-ml', NULL),
  ('Web Development', 'web-dev', NULL),
  ('Mobile Development', 'mobile-dev', NULL),
  ('DevOps & Cloud', 'devops-cloud', NULL),
  ('Database & Backend', 'db-backend', NULL),
  ('Cursor', 'cursor', 'web-dev'),
  ('Replit', 'replit', 'web-dev'),
  ('v0', 'v0', 'web-dev'),
  ('Lovable', 'lovable', 'web-dev'),
  ('React', 'react', 'web-dev'),
  ('Vue.js', 'vuejs', 'web-dev'),
  ('Next.js', 'nextjs', 'web-dev'),
  ('Python', 'python', NULL),
  ('TypeScript', 'typescript', NULL);

-- Function to get authenticated user ID
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is expert
CREATE OR REPLACE FUNCTION is_expert()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM expert_profiles ep
    JOIN profiles p ON p.id = ep.user_id
    WHERE p.auth_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is agency admin
CREATE OR REPLACE FUNCTION is_agency_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_profiles ap
    JOIN profiles p ON p.id = ap.user_id
    WHERE p.auth_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;
