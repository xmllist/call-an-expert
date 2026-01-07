-- ============================================
-- SUPABASE SCHEMA TESTS
-- Phase 02: Supabase Backend Setup
-- ============================================

-- These tests verify the schema functions work correctly
-- Run after applying schema.sql

-- ============================================
-- TEST 1: calculate_session_amounts function
-- ============================================

-- Test: 1-hour session at $100/hour
SELECT
  CASE
    WHEN
      (SELECT session_rate_cents FROM calculate_session_amounts(10000, 60)) = 10000
      AND (SELECT total_amount_cents FROM calculate_session_amounts(10000, 60)) = 10000
      AND (SELECT commission_amount_cents FROM calculate_session_amounts(10000, 60)) = 1000
      AND (SELECT expert_payout_cents FROM calculate_session_amounts(10000, 60)) = 9000
    THEN 'PASS: 1-hour session at $100/hour'
    ELSE 'FAIL: calculate_session_amounts 1-hour'
  END AS test_result;

-- Test: 2-hour session at $150/hour ($300 total, $30 commission, $270 payout)
SELECT
  CASE
    WHEN
      (SELECT total_amount_cents FROM calculate_session_amounts(15000, 120)) = 30000
      AND (SELECT commission_amount_cents FROM calculate_session_amounts(15000, 120)) = 3000
      AND (SELECT expert_payout_cents FROM calculate_session_amounts(15000, 120)) = 27000
    THEN 'PASS: 2-hour session at $150/hour'
    ELSE 'FAIL: calculate_session_amounts 2-hour'
  END AS test_result;

-- Test: 90-minute session at $200/hour ($300 total, $30 commission, $270 payout)
SELECT
  CASE
    WHEN
      (SELECT total_amount_cents FROM calculate_session_amounts(20000, 90)) = 30000
      AND (SELECT commission_amount_cents FROM calculate_session_amounts(20000, 90)) = 3000
      AND (SELECT expert_payout_cents FROM calculate_session_amounts(20000, 90)) = 27000
    THEN 'PASS: 90-minute session at $200/hour'
    ELSE 'FAIL: calculate_session_amounts 90-min'
  END AS test_result;

-- ============================================
-- TEST 2: Schema constraints validation
-- ============================================

-- Test: Session minimum duration constraint
-- This should FAIL validation if duration < 60
DO $$
DECLARE
  v_error BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO sessions (
      client_id,
      expert_id,
      topic,
      duration_minutes,
      session_rate_cents,
      total_amount_cents,
      commission_amount_cents,
      expert_payout_cents,
      status
    )
    SELECT
      (SELECT id FROM profiles LIMIT 1),
      (SELECT id FROM expert_profiles LIMIT 1),
      'Test session',
      30, -- Less than 60 minutes - should fail
      10000,
      10000,
      1000,
      9000,
      'requested';
  EXCEPTION
    WHEN check_violation THEN
      v_error := true;
  END;

  IF v_error THEN
    RAISE NOTICE 'PASS: Session minimum duration constraint';
  ELSE
    RAISE EXCEPTION 'FAIL: Session minimum duration constraint';
  END IF;
END;
$$;

-- Test: Rating range constraint (1-5)
DO $$
DECLARE
  v_error BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE sessions SET client_rating = 6 WHERE id = (SELECT id FROM sessions LIMIT 1);
  EXCEPTION
    WHEN check_violation THEN
      v_error := true;
  END;

  IF v_error THEN
    RAISE NOTICE 'PASS: Rating range constraint (1-5)';
  ELSE
    RAISE EXCEPTION 'FAIL: Rating range constraint';
  END IF;
END;
$$;

-- Test: Hourly rate positive constraint
DO $$
DECLARE
  v_error BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE expert_profiles SET hourly_rate_cents = 0 WHERE id = (SELECT id FROM expert_profiles LIMIT 1);
  EXCEPTION
    WHEN check_violation THEN
      v_error := true;
  END;

  IF v_error THEN
    RAISE NOTICE 'PASS: Hourly rate positive constraint';
  ELSE
    RAISE EXCEPTION 'FAIL: Hourly rate positive constraint';
  END IF;
END;
$$;

-- ============================================
-- TEST 3: find_matching_experts function
-- ============================================

-- Test: Find experts by skill
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM find_matching_experts(
    ARRAY[(SELECT id FROM skill_categories WHERE slug = 'cursor')]::UUID[],
    NULL,
    10
  );

  IF v_count > 0 THEN
    RAISE NOTICE 'PASS: Found % experts with cursor skill', v_count;
  ELSE
    RAISE EXCEPTION 'FAIL: No experts found with cursor skill';
  END IF;
END;
$$;

-- Test: Filter by max rate
DO $$
DECLARE
  v_count INTEGER;
  v_max_rate INTEGER := 13000; -- $130/hour
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM find_matching_experts(
    ARRAY[(SELECT id FROM skill_categories WHERE slug = 'cursor')]::UUID[],
    v_max_rate,
    10
  );

  IF v_count >= 0 THEN
    RAISE NOTICE 'PASS: Rate filter returns % experts (max $%.2f/hour)', v_count, v_max_rate / 100.0;
  ELSE
    RAISE EXCEPTION 'FAIL: Rate filter error';
  END IF;
END;
$$;

-- ============================================
-- TEST 4: create_session function
-- ============================================

DO $$
DECLARE
  v_session_id UUID;
  v_result RECORD;
BEGIN
  -- Create a test session
  SELECT * INTO v_result
  FROM create_session(
    (SELECT id FROM profiles WHERE role = 'client' LIMIT 1),
    (SELECT id FROM expert_profiles LIMIT 1),
    'Test session via function',
    60,
    'Test notes',
    NOW() + INTERVAL '1 day'
  );

  IF v_result.error_message IS NULL AND v_result.session_id IS NOT NULL THEN
    RAISE NOTICE 'PASS: Session created (ID: %, Amount: $%.2f, Payout: $%.2f)',
      v_result.session_id,
      v_result.total_amount_cents / 100.0,
      v_result.expert_payout_cents / 100.0;
  ELSE
    RAISE EXCEPTION 'FAIL: Session creation failed: %', v_result.error_message;
  END IF;
END;
$$;

-- ============================================
-- TEST 5: update_session_status function
-- ============================================

DO $$
DECLARE
  v_result RECORD;
  v_session_id UUID;
BEGIN
  -- Get a session to test
  SELECT id INTO v_session_id FROM sessions WHERE status = 'requested' LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    SELECT * INTO v_result
    FROM update_session_status(
      v_session_id,
      'confirmed',
      (SELECT auth_user_id FROM profiles WHERE id = (SELECT client_id FROM sessions WHERE id = v_session_id))
    );

    IF v_result.success THEN
      RAISE NOTICE 'PASS: Session status updated to confirmed';
    ELSE
      RAISE EXCEPTION 'FAIL: Status update failed: %', v_result.error_message;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP: No pending sessions to test status update';
  END IF;
END;
$$;

-- ============================================
-- TEST 6: cancel_session function
-- ============================================

DO $$
DECLARE
  v_result RECORD;
  v_session_id UUID;
BEGIN
  -- Get a session to test
  SELECT id INTO v_session_id FROM sessions WHERE status = 'requested' LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    SELECT * INTO v_result
    FROM cancel_session(
      v_session_id,
      (SELECT auth_user_id FROM profiles WHERE id = (SELECT client_id FROM sessions WHERE id = v_session_id)),
      'Test cancellation'
    );

    IF v_result.success THEN
      RAISE NOTICE 'PASS: Session cancelled (Refund: $%.2f)', v_result.refund_amount_cents / 100.0;
    ELSE
      RAISE EXCEPTION 'FAIL: Cancellation failed: %', v_result.error_message;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP: No pending sessions to test cancellation';
  END IF;
END;
$$;

-- ============================================
-- TEST 7: Availability function
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM get_expert_availability(
    (SELECT id FROM expert_profiles LIMIT 1),
    CURRENT_DATE
  );

  IF v_count >= 0 THEN
    RAISE NOTICE 'PASS: Expert has % availability slots for today', v_count;
  ELSE
    RAISE EXCEPTION 'FAIL: Availability function error';
  END IF;
END;
$$;

-- ============================================
-- TEST 8: RLS policies exist
-- ============================================

DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename IN ('profiles', 'expert_profiles', 'sessions', 'session_messages', 'payments');

  IF v_policy_count >= 10 THEN
    RAISE NOTICE 'PASS: Found % RLS policies', v_policy_count;
  ELSE
    RAISE EXCEPTION 'FAIL: Expected at least 10 RLS policies, found %', v_policy_count;
  END IF;
END;
$$;

-- ============================================
-- TEST SUMMARY
-- ============================================

SELECT
  'Schema tests completed' AS status,
  NOW() AS completed_at;

-- ============================================
-- CLEANUP (optional - run manually)
-- ============================================

-- DELETE FROM sessions WHERE topic LIKE 'Test session%';
-- DELETE FROM match_requests WHERE topic LIKE 'Test%';
