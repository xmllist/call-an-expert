-- Initial Database Schema for Call-an-Expert MVP Platform
-- Migration: 001_initial_schema.sql
--
-- This migration creates the core tables for the platform:
-- - profiles: User profiles extending Supabase auth.users
-- - experts: Expert profiles with expertise, rates, and availability
-- - help_requests: Issues submitted from Chrome extension
-- - sessions: Booked expert sessions
-- - messages: Chat messages during sessions
-- - ratings: Post-session ratings and reviews
-- - subscriptions: Stripe subscription tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with additional profile information
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_expert BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX idx_profiles_email ON profiles(email);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EXPERTS TABLE
-- Expert profiles with expertise tags, rates, and availability status
-- ============================================================================
CREATE TABLE experts (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  expertise_tags TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate INTEGER NOT NULL CHECK (hourly_rate >= 0), -- Rate in cents
  session_rate INTEGER NOT NULL CHECK (session_rate >= 0), -- 15-min session rate in cents ($15-50 = 1500-5000 cents)
  available BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_sessions INTEGER DEFAULT 0 CHECK (total_sessions >= 0),
  total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0),
  stripe_account_id TEXT, -- Stripe Connect account for payouts
  approved BOOLEAN DEFAULT FALSE, -- Admin approval for vetting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for expert discovery and filtering
CREATE INDEX idx_experts_approved ON experts(approved);
CREATE INDEX idx_experts_available ON experts(available);
CREATE INDEX idx_experts_expertise_tags ON experts USING GIN(expertise_tags);
CREATE INDEX idx_experts_rating ON experts(rating DESC);

CREATE TRIGGER experts_updated_at
  BEFORE UPDATE ON experts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELP_REQUESTS TABLE
-- Issues captured from Chrome extension for expert matching
-- ============================================================================
CREATE TABLE help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  description TEXT NOT NULL CHECK (char_length(description) >= 1),
  screenshot_url TEXT, -- URL to screenshot in Supabase Storage
  context JSONB DEFAULT '{}', -- Additional context captured from page (URL, error messages, etc.)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'in_progress', 'resolved', 'cancelled')),
  matched_expert_ids UUID[] DEFAULT '{}', -- Experts matched for this request
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for help request queries
CREATE INDEX idx_help_requests_user_id ON help_requests(user_id);
CREATE INDEX idx_help_requests_status ON help_requests(status);
CREATE INDEX idx_help_requests_created_at ON help_requests(created_at DESC);

CREATE TRIGGER help_requests_updated_at
  BEFORE UPDATE ON help_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SESSIONS TABLE
-- Booked 15-minute expert sessions with payment tracking
-- ============================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  help_request_id UUID REFERENCES help_requests(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  expert_id UUID REFERENCES experts(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 15 CHECK (duration_minutes > 0),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pending_payment', 'paid', 'active', 'completed', 'cancelled', 'no_show')),
  payment_intent_id TEXT, -- Stripe Payment Intent ID
  amount INTEGER NOT NULL CHECK (amount >= 0), -- Amount in cents
  platform_fee INTEGER DEFAULT 0 CHECK (platform_fee >= 0), -- Platform's 10% fee in cents
  expert_payout INTEGER DEFAULT 0 CHECK (expert_payout >= 0), -- Expert's 90% payout in cents
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for session queries
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expert_id ON sessions(expert_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX idx_sessions_help_request_id ON sessions(help_request_id);
CREATE INDEX idx_sessions_payment_intent_id ON sessions(payment_intent_id);

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MESSAGES TABLE
-- Chat messages during sessions
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) >= 1),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file')),
  file_url TEXT, -- URL for file attachments
  read_at TIMESTAMPTZ, -- When message was read by recipient
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for message queries
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(session_id, created_at);

-- ============================================================================
-- RATINGS TABLE
-- Post-session ratings and reviews (bidirectional - user rates expert, expert rates user)
-- ============================================================================
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  rater_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ratee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure only one rating per rater per session
  CONSTRAINT unique_rating_per_session UNIQUE (session_id, rater_id)
);

-- Create indexes for rating queries
CREATE INDEX idx_ratings_session_id ON ratings(session_id);
CREATE INDEX idx_ratings_ratee_id ON ratings(ratee_id);
CREATE INDEX idx_ratings_rater_id ON ratings(rater_id);

-- Function to update expert rating when new rating is added
CREATE OR REPLACE FUNCTION update_expert_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  -- Only update if the ratee is an expert
  IF EXISTS (SELECT 1 FROM experts WHERE id = NEW.ratee_id) THEN
    SELECT AVG(score)::DECIMAL(3,2), COUNT(*)
    INTO avg_rating, review_count
    FROM ratings
    WHERE ratee_id = NEW.ratee_id;

    UPDATE experts
    SET rating = COALESCE(avg_rating, 0),
        total_reviews = review_count
    WHERE id = NEW.ratee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ratings_update_expert_rating
  AFTER INSERT OR UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_expert_rating();

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- Stripe subscription tracking for agency plans ($99-499/year)
-- ============================================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'professional', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')),
  sessions_included INTEGER DEFAULT 0 CHECK (sessions_included >= 0), -- Sessions included in plan
  sessions_remaining INTEGER DEFAULT 0 CHECK (sessions_remaining >= 0), -- Sessions remaining this period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for subscription queries
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create profile automatically when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update session count for experts
CREATE OR REPLACE FUNCTION update_expert_session_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE experts
    SET total_sessions = total_sessions + 1
    WHERE id = NEW.expert_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_update_expert_count
  AFTER UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_expert_session_count();
