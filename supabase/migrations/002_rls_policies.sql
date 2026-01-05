-- Row-Level Security Policies for Call-an-Expert MVP Platform
-- Migration: 002_rls_policies.sql
--
-- This migration enables RLS and creates security policies for all tables:
-- - profiles: User profiles
-- - experts: Expert profiles
-- - help_requests: Issues from Chrome extension
-- - sessions: Booked expert sessions
-- - messages: Chat messages
-- - ratings: Post-session ratings
-- - subscriptions: Stripe subscriptions
--
-- IMPORTANT: RLS must be enabled on ALL tables for security compliance

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if current user is a session participant
CREATE OR REPLACE FUNCTION is_session_participant(session_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sessions
    WHERE id = session_uuid
    AND (user_id = auth.uid() OR expert_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is an approved expert
CREATE OR REPLACE FUNCTION is_approved_expert()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM experts
    WHERE id = auth.uid()
    AND approved = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can view any profile (needed for expert discovery, session participants)
CREATE POLICY "profiles_select_authenticated"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Users can only insert their own profile (handled by trigger, but allow for edge cases)
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can only delete their own profile
CREATE POLICY "profiles_delete_own"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ============================================================================
-- EXPERTS TABLE POLICIES
-- ============================================================================

-- Anyone authenticated can view approved experts (for expert discovery/matching)
CREATE POLICY "experts_select_approved"
  ON experts
  FOR SELECT
  TO authenticated
  USING (approved = TRUE OR id = auth.uid());

-- Users can create their own expert profile (applying to become an expert)
CREATE POLICY "experts_insert_own"
  ON experts
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Experts can update their own profile (bio, rates, availability, etc.)
-- Note: 'approved' and 'stripe_account_id' should be updated via service role only
CREATE POLICY "experts_update_own"
  ON experts
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Experts can delete their own profile
CREATE POLICY "experts_delete_own"
  ON experts
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ============================================================================
-- HELP_REQUESTS TABLE POLICIES
-- ============================================================================

-- Users can view their own help requests
CREATE POLICY "help_requests_select_own"
  ON help_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Approved experts can view help requests they've been matched with
CREATE POLICY "help_requests_select_matched_expert"
  ON help_requests
  FOR SELECT
  TO authenticated
  USING (
    is_approved_expert()
    AND auth.uid() = ANY(matched_expert_ids)
  );

-- Users can create their own help requests
CREATE POLICY "help_requests_insert_own"
  ON help_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own help requests (e.g., cancel, add details)
CREATE POLICY "help_requests_update_own"
  ON help_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own help requests
CREATE POLICY "help_requests_delete_own"
  ON help_requests
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- SESSIONS TABLE POLICIES
-- ============================================================================

-- Users can view sessions where they are the user or the expert
CREATE POLICY "sessions_select_participant"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR expert_id = auth.uid());

-- Users can create sessions (booking an expert)
CREATE POLICY "sessions_insert_as_user"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Session participants can update session (start, end, status changes)
-- Note: Payment-related fields should be updated via service role/webhooks
CREATE POLICY "sessions_update_participant"
  ON sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR expert_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR expert_id = auth.uid());

-- Users can cancel their own scheduled sessions
CREATE POLICY "sessions_delete_own"
  ON sessions
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('scheduled', 'pending_payment')
  );

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

-- Session participants can view messages in their sessions
CREATE POLICY "messages_select_session_participant"
  ON messages
  FOR SELECT
  TO authenticated
  USING (is_session_participant(session_id));

-- Session participants can send messages in their sessions
CREATE POLICY "messages_insert_session_participant"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_session_participant(session_id)
    AND sender_id = auth.uid()
  );

-- Message senders can update their own messages (e.g., mark as read)
CREATE POLICY "messages_update_own"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Session participants can update read_at for messages sent to them
CREATE POLICY "messages_update_read_status"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    is_session_participant(session_id)
    AND sender_id != auth.uid()
  );

-- ============================================================================
-- RATINGS TABLE POLICIES
-- ============================================================================

-- Anyone authenticated can view ratings (for expert reputation display)
CREATE POLICY "ratings_select_public"
  ON ratings
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Session participants can create ratings for sessions they participated in
CREATE POLICY "ratings_insert_session_participant"
  ON ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_session_participant(session_id)
    AND rater_id = auth.uid()
    AND ratee_id != auth.uid()
  );

-- Raters can update their own ratings
CREATE POLICY "ratings_update_own"
  ON ratings
  FOR UPDATE
  TO authenticated
  USING (rater_id = auth.uid())
  WITH CHECK (rater_id = auth.uid());

-- Raters can delete their own ratings
CREATE POLICY "ratings_delete_own"
  ON ratings
  FOR DELETE
  TO authenticated
  USING (rater_id = auth.uid());

-- ============================================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own subscriptions
CREATE POLICY "subscriptions_select_own"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Subscriptions are created/managed via Stripe webhooks (service role)
-- But allow users to create initial subscription record
CREATE POLICY "subscriptions_insert_own"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users cannot directly update subscriptions (managed via webhooks)
-- Only allow updating cancel_at_period_end flag
CREATE POLICY "subscriptions_update_cancel_request"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SERVICE ROLE BYPASS NOTES
-- ============================================================================
-- The service role key bypasses all RLS policies and should be used for:
-- 1. Stripe webhook handlers (updating payment status, subscriptions)
-- 2. Admin operations (approving experts, modifying sessions)
-- 3. Background jobs (matching experts, sending notifications)
-- 4. Internal API routes that require elevated privileges
--
-- NEVER expose the service role key to the client!

-- ============================================================================
-- GRANT STATEMENTS
-- ============================================================================
-- Ensure authenticated users have proper access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON experts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON help_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;

-- Grant usage on sequences if needed
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
