-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Phase 02: Supabase Backend Setup
-- ============================================

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Public read: Anyone can view profile basics (for expert discovery)
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Self update: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth_user_id() = auth_user_id);

-- Insert: Users can insert their own profile (handled by auth trigger)

-- ============================================
-- EXPERT PROFILES POLICIES
-- ============================================

-- Public read: Expert profiles visible for discovery
CREATE POLICY "Expert profiles are viewable by everyone"
  ON expert_profiles FOR SELECT
  USING (true);

-- Self update: Expert can update their own profile
CREATE POLICY "Experts can update own profile"
  ON expert_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = expert_profiles.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Insert: Experts can create their own profile
CREATE POLICY "Experts can create own profile"
  ON expert_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = expert_profiles.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- EXPERT SKILLS POLICIES
-- ============================================

-- Public read: Skills visible for matching
CREATE POLICY "Expert skills are viewable by everyone"
  ON expert_skills FOR SELECT
  USING (true);

-- Self management: Expert can manage their own skills
CREATE POLICY "Experts can manage own skills"
  ON expert_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM expert_profiles ep
      WHERE ep.id = expert_skills.expert_id
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = ep.user_id
            AND p.auth_user_id = auth.uid()
        )
    )
  );

-- ============================================
-- AGENCY PROFILES POLICIES
-- ============================================

-- Self read: Agency can view own profile
CREATE POLICY "Agencies can view own profile"
  ON agency_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = agency_profiles.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Self update: Agency can update own profile
CREATE POLICY "Agencies can update own profile"
  ON agency_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = agency_profiles.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- SESSIONS POLICIES
-- ============================================

-- Client view: Client can view their own sessions
CREATE POLICY "Clients can view own sessions"
  ON sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = sessions.client_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Expert view: Expert can view sessions they're assigned to
CREATE POLICY "Experts can view own sessions"
  ON sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expert_profiles ep
      WHERE ep.id = sessions.expert_id
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = ep.user_id
            AND p.auth_user_id = auth.uid()
        )
    )
  );

-- Client create: Client can create sessions
CREATE POLICY "Clients can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = sessions.client_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Expert update: Expert can update session status/notes
CREATE POLICY "Experts can update own sessions"
  ON sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expert_profiles ep
      WHERE ep.id = sessions.expert_id
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = ep.user_id
            AND p.auth_user_id = auth.uid()
        )
    )
  );

-- ============================================
-- SESSION MESSAGES POLICIES
-- ============================================

-- Participant view: Session participants can view messages
CREATE POLICY "Session participants can view messages"
  ON session_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_messages.session_id
        AND (
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = s.client_id
              AND p.auth_user_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM expert_profiles ep
            JOIN profiles p ON p.id = ep.user_id
            WHERE ep.id = s.expert_id
              AND p.auth_user_id = auth.uid()
          )
        )
    )
  );

-- Participant insert: Session participants can send messages
CREATE POLICY "Session participants can send messages"
  ON session_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_messages.session_id
        AND (
          s.client_id = session_messages.sender_id
          OR
          EXISTS (
            SELECT 1 FROM expert_profiles ep
            WHERE ep.id = s.expert_id
          )
        )
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = session_messages.sender_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- AVAILABILITY SLOTS POLICIES
-- ============================================

-- Public read: Availability visible for booking
CREATE POLICY "Availability slots are viewable"
  ON availability_slots FOR SELECT
  USING (true);

-- Self management: Expert can manage own availability
CREATE POLICY "Experts can manage own availability"
  ON availability_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM expert_profiles ep
      WHERE ep.id = availability_slots.expert_id
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = ep.user_id
            AND p.auth_user_id = auth.uid()
        )
    )
  );

-- ============================================
-- PAYMENTS POLICIES
-- ============================================

-- Client view: Client can view own payments
CREATE POLICY "Clients can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = payments.client_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Expert view: Expert can view payments for their sessions
CREATE POLICY "Experts can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expert_profiles ep
      WHERE ep.id = payments.expert_id
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = ep.user_id
            AND p.auth_user_id = auth.uid()
        )
    )
  );

-- Insert: System can insert payments (Stripe webhook)
CREATE POLICY "System can insert payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL); -- Requires auth

-- ============================================
-- MATCH REQUESTS POLICIES
-- ============================================

-- Client view: Client can view own match requests
CREATE POLICY "Clients can view own match requests"
  ON match_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = match_requests.client_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Client create: Client can create match requests
CREATE POLICY "Clients can create match requests"
  ON match_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = match_requests.client_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Client update: Client can update own match requests
CREATE POLICY "Clients can update own match requests"
  ON match_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = match_requests.client_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- MATCH RESULTS POLICIES
-- ============================================

-- Expert view: Expert can view their match results
CREATE POLICY "Experts can view own match results"
  ON match_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expert_profiles ep
      WHERE ep.id = match_results.expert_id
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = ep.user_id
            AND p.auth_user_id = auth.uid()
        )
    )
  );

-- Expert update: Expert can respond to match requests
CREATE POLICY "Experts can respond to match requests"
  ON match_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expert_profiles ep
      WHERE ep.id = match_results.expert_id
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = ep.user_id
            AND p.auth_user_id = auth.uid()
        )
    )
  );

-- ============================================
-- ONLINE STATUS POLICIES
-- ============================================

-- Self: User can view and update own status
CREATE POLICY "Users can manage own online status"
  ON online_status FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = online_status.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Public read: Everyone can see who's online (for real-time indicators)
CREATE POLICY "Online status is publicly visible"
  ON online_status FOR SELECT
  USING (true);

-- ============================================
-- SKILL CATEGORIES POLICIES
-- ============================================

-- Public read: Skills visible for search
CREATE POLICY "Skill categories are publicly viewable"
  ON skill_categories FOR SELECT
  USING (true);

-- ============================================
-- DATABASE FUNCTIONS (for RLS integration)
-- ============================================

-- Get current user's profile ID
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user is client
CREATE OR REPLACE FUNCTION is_client()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid() AND role = 'client'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user can access session
CREATE OR REPLACE FUNCTION can_access_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = p_session_id
      AND (
        s.client_id = current_profile_id()
        OR
        s.expert_id IN (SELECT id FROM expert_profiles WHERE user_id = current_profile_id())
      )
  );
$$ LANGUAGE sql SECURITY DEFINER;
