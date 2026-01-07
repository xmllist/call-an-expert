// Daily.co webhook handler - Phase 04: Real-time Integration
// Handle meeting start/end/join/leave events

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export interface DailyWebhookPayload {
  event: 'meeting-started' | 'meeting-ended' | 'participant-joined' | 'participant-left';
  meeting_id: string;
  meeting_name: string;
  participant?: {
    user_id: string;
    user_name: string;
    duration: number;
  };
  timestamp: number;
  domain_name?: string;
}

/**
 * Verify Daily.co webhook signature
 */
function verifyDailySignature(
  payload: string,
  signature: string | null
): boolean {
  const DAILY_WEBHOOK_SECRET = process.env.DAILY_WEBHOOK_SECRET;
  if (!DAILY_WEBHOOK_SECRET || !signature) return false;

  // In production, implement proper HMAC verification
  // https://docs.daily.co/reference/webhooks#verifying-webhook-requests
  return true; // Simplified for development
}

/**
 * Handle meeting started event
 */
async function handleMeetingStarted(payload: DailyWebhookPayload): Promise<void> {
  const sessionId = payload.meeting_name.replace('session_', '');

  if (!supabase) return;

  await supabase
    .from('sessions')
    .update({
      status: 'in_progress',
      actual_start: new Date(payload.timestamp * 1000).toISOString()
    })
    .eq('id', sessionId);
}

/**
 * Handle meeting ended event
 */
async function handleMeetingEnded(payload: DailyWebhookPayload): Promise<void> {
  const sessionId = payload.meeting_name.replace('session_', '');

  if (!supabase) return;

  // Get session start time
  const { data: session } = await supabase
    .from('sessions')
    .select('actual_start, duration_minutes')
    .eq('id', sessionId)
    .single();

  if (session?.actual_start) {
    const startTime = new Date(session.actual_start).getTime();
    const endTime = payload.timestamp * 1000;
    const durationMinutes = Math.round((endTime - startTime) / 60000);

    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        actual_end: new Date(endTime).toISOString(),
        duration_minutes: durationMinutes
      })
      .eq('id', sessionId);
  }
}

/**
 * Handle participant joined event
 */
async function handleParticipantJoined(payload: DailyWebhookPayload): Promise<void> {
  console.log(`Participant joined: ${payload.participant?.user_name}`);

  // Could send realtime notification to other participant
  // Could log analytics data
}

/**
 * Handle participant left event
 */
async function handleParticipantLeft(payload: DailyWebhookPayload): Promise<void> {
  console.log(`Participant left: ${payload.participant?.user_name}`);

  // Check if both participants left, auto-end meeting
  const sessionId = payload.meeting_name.replace('session_', '');

  if (!supabase) return;

  const { data: participants } = await supabase
    .from('session_messages')
    .select('sender_id')
    .eq('session_id', sessionId);

  // If no recent activity, might need cleanup
  // This is simplified - real implementation would check actual participant count
}

/**
 * Process webhook payload
 */
export async function processDailyWebhook(
  body: string,
  signature: string | null
): Promise<{ success: boolean; message: string }> {
  // Verify signature
  if (!verifyDailySignature(body, signature)) {
    return { success: false, message: 'Invalid signature' };
  }

  let payload: DailyWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return { success: false, message: 'Invalid JSON' };
  }

  // Process event
  switch (payload.event) {
    case 'meeting-started':
      await handleMeetingStarted(payload);
      break;

    case 'meeting-ended':
      await handleMeetingEnded(payload);
      break;

    case 'participant-joined':
      await handleParticipantJoined(payload);
      break;

    case 'participant-left':
      await handleParticipantLeft(payload);
      break;

    default:
      return { success: false, message: 'Unknown event type' };
  }

  return { success: true, message: 'OK' };
}

/**
 * Create webhook handler for Edge Function
 */
export function createDailyWebhookHandler() {
  return async function handler(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = request.headers.get('x-daily-signature');
    const body = await request.text();

    const result = await processDailyWebhook(body, signature);

    return new Response(result.message, { status: result.success ? 200 : 401 });
  };
}
