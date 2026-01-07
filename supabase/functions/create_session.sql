-- ============================================
-- Edge Function: create_session
-- Creates a new session with amount calculations (1-hour minimum)
-- ============================================

-- Database function for session creation
CREATE OR REPLACE FUNCTION create_session(
  p_client_id UUID,
  p_expert_id UUID,
  p_topic TEXT,
  p_duration_minutes INTEGER DEFAULT 60,
  p_notes TEXT DEFAULT NULL,
  p_scheduled_start TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  session_id UUID,
  total_amount_cents INTEGER,
  commission_amount_cents INTEGER,
  expert_payout_cents INTEGER,
  daily_room_url TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_session_id UUID;
  v_hourly_rate INTEGER;
  v_total_amount INTEGER;
  v_commission INTEGER;
  v_payout INTEGER;
  v_daily_room_name TEXT;
  v_daily_room_url TEXT;
BEGIN
  -- Get expert's hourly rate
  SELECT hourly_rate_cents INTO v_hourly_rate
  FROM expert_profiles
  WHERE id = p_expert_id;

  IF v_hourly_rate IS NULL THEN
    error_message := 'Expert not found';
    RETURN;
  END IF;

  -- Validate minimum duration (1 hour)
  IF p_duration_minutes < 60 THEN
    p_duration_minutes := 60;
  END IF;

  -- Calculate amounts using the helper function
  SELECT
    session_rate_cents,
    total_amount_cents,
    commission_amount_cents,
    expert_payout_cents
  INTO v_hourly_rate, v_total_amount, v_commission, v_payout
  FROM calculate_session_amounts(v_hourly_rate, p_duration_minutes);

  -- Create Daily.co room name
  v_daily_room_name := 'session_' || p_client_id::TEXT || '_' || p_expert_id::TEXT || '_' || NOW()::TEXT;
  v_daily_room_url := 'https://callanexpert.daily.co/' || v_daily_room_name;

  -- Insert session
  INSERT INTO sessions (
    client_id,
    expert_id,
    topic,
    notes,
    duration_minutes,
    session_rate_cents,
    total_amount_cents,
    commission_amount_cents,
    expert_payout_cents,
    scheduled_start,
    scheduled_end,
    daily_room_name,
    daily_room_url,
    status
  ) VALUES (
    p_client_id,
    p_expert_id,
    p_topic,
    p_notes,
    p_duration_minutes,
    v_hourly_rate,
    v_total_amount,
    v_commission,
    v_payout,
    p_scheduled_start,
    p_scheduled_start + (p_duration_minutes || ' minutes')::INTERVAL,
    v_daily_room_name,
    v_daily_room_url,
    'requested'
  )
  RETURNING id INTO v_session_id;

  -- Return result
  session_id := v_session_id;
  total_amount_cents := v_total_amount;
  commission_amount_cents := v_commission;
  expert_payout_cents := v_payout;
  daily_room_url := v_daily_room_url;
  error_message := NULL;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Edge Function: update_session_status
-- Updates session status with proper transitions
-- ============================================

CREATE OR REPLACE FUNCTION update_session_status(
  p_session_id UUID,
  p_new_status TEXT,
  p_user_id UUID, -- For authorization check
  p_actual_start TIMESTAMPTZ DEFAULT NULL,
  p_actual_end TIMESTAMPTZ DEFAULT NULL,
  p_feedback TEXT DEFAULT NULL,
  p_rating INTEGER DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_current_status TEXT;
  v_is_authorized BOOLEAN := false;
  v_expert_id UUID;
  v_client_id UUID;
BEGIN
  -- Get current session info
  SELECT status, expert_id, client_id
  INTO v_current_status, v_expert_id, v_client_id
  FROM sessions
  WHERE id = p_session_id;

  IF v_current_status IS NULL THEN
    success := false;
    error_message := 'Session not found';
    RETURN;
  END IF;

  -- Check authorization
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_client_id AND auth_user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM expert_profiles ep
    JOIN profiles p ON p.id = ep.user_id
    WHERE ep.id = v_expert_id AND p.auth_user_id = p_user_id
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    success := false;
    error_message := 'Not authorized to update this session';
    RETURN;
  END IF;

  -- Validate status transitions
  IF v_current_status = 'completed' AND p_new_status != 'completed' THEN
    success := false;
    error_message := 'Cannot change status of completed session';
    RETURN;
  END IF;

  -- Update session
  UPDATE sessions
  SET
    status = p_new_status::session_status,
    actual_start = COALESCE(p_actual_start, actual_start),
    actual_end = COALESCE(p_actual_end, actual_end),
    client_feedback = COALESCE(p_feedback, client_feedback),
    client_rating = COALESCE(p_rating, client_rating),
    updated_at = NOW()
  WHERE id = p_session_id;

  -- Update expert stats if completed
  IF p_new_status = 'completed' THEN
    PERFORM update_expert_stats(v_expert_id);
  END IF;

  success := true;
  error_message := NULL;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Edge Function: cancel_session
-- Cancels a session with refund calculation
-- ============================================

CREATE OR REPLACE FUNCTION cancel_session(
  p_session_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  refund_amount_cents INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_session sessions;
  v_is_client BOOLEAN;
  v_refund_pct DECIMAL(3, 2) := 1.00; -- 100% refund by default
BEGIN
  -- Get session
  SELECT * INTO v_session
  FROM sessions
  WHERE id = p_session_id;

  IF v_session.id IS NULL THEN
    success := false;
    refund_amount_cents := 0;
    error_message := 'Session not found';
    RETURN;
  END IF;

  -- Check if user is client
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_session.client_id AND auth_user_id = p_user_id
  ) INTO v_is_client;

  IF NOT v_is_client THEN
    success := false;
    refund_amount_cents := 0;
    error_message := 'Only the client can cancel a session';
    RETURN;
  END IF;

  -- Check if session can be cancelled
  IF v_session.status NOT IN ('requested', 'confirmed') THEN
    success := false;
    refund_amount_cents := 0;
    error_message := 'Session cannot be cancelled in current status';
    RETURN;
  END IF;

  -- Calculate refund (100% if > 24h before start, else 50%)
  IF v_session.scheduled_start IS NOT NULL AND
     v_session.scheduled_start > NOW() + INTERVAL '24 hours' THEN
    v_refund_pct := 1.00;
  ELSIF v_session.status = 'in_progress' THEN
    v_refund_pct := 0.00; -- No refund for in-progress cancellation
  ELSE
    v_refund_pct := 0.50; -- 50% refund
  END IF;

  -- Update session status
  UPDATE sessions
  SET
    status = 'cancelled',
    notes = COALESCE(p_reason, notes),
    updated_at = NOW()
  WHERE id = p_session_id;

  success := true;
  refund_amount_cents := v_session.total_amount_cents * v_refund_pct;
  error_message := NULL;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
