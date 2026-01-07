// Session realtime subscriptions - Phase 04: Real-time Integration
// Supabase Realtime for session updates and chat

import { createClient } from '@supabase/supabase-js';
import type { Session, session_messages } from '~/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export interface SessionUpdate {
  session: Session;
  type: 'status_change' | 'message' | 'participant';
  data?: Record<string, unknown>;
}

type StatusChangeCallback = (session: Session) => void;
type MessageCallback = (message: session_messages) => void;
type ParticipantCallback = (participant: { userId: string; action: 'join' | 'leave' }) => void;

interface SubscribeOptions {
  sessionId: string;
  onStatusChange?: StatusChangeCallback;
  onMessage?: MessageCallback;
  onParticipant?: ParticipantCallback;
}

/**
 * Subscribe to session updates
 */
export function subscribeToSession(options: SubscribeOptions): () => void {
  if (!supabase) return () => {};

  const { sessionId, onStatusChange, onMessage, onParticipant } = options;
  const channel = supabase.channel(`session:${sessionId}`);

  // Session status updates
  if (onStatusChange) {
    channel
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        onStatusChange(payload.new as Session);
      })
      .subscribe();
  }

  // Chat messages
  if (onMessage) {
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        onMessage(payload.new as session_messages);
      })
      .subscribe();
  }

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to expert's pending requests
 */
export function subscribeToPendingRequests(
  expertId: string,
  callback: (session: Session) => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`expert-requests:${expertId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'sessions',
      filter: `expert_id=eq.${expertId}`
    }, (payload) => {
      callback(payload.new as Session);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Send a chat message
 */
export async function sendSessionMessage(
  sessionId: string,
  senderId: string,
  content: string,
  messageType: 'text' | 'file' | 'system' = 'text'
): Promise<session_messages | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('session_messages')
    .insert({
      session_id: sessionId,
      sender_id: senderId,
      message_type: messageType,
      content
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return data;
}

/**
 * Get session chat history
 */
export async function getSessionMessages(
  sessionId: string,
  limit: number = 100
): Promise<session_messages[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('session_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data || [];
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: Session['status']
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', sessionId);

  return !error;
}

/**
 * Subscribe to all session updates for a user
 */
export function subscribeToUserSessions(
  userId: string,
  role: 'client' | 'expert',
  callback: (update: SessionUpdate) => void
): () => void {
  if (!supabase) return () => {};

  const filter = role === 'client'
    ? `client_id=eq.${userId}`
    : `expert_id=eq.${userId}`;

  const channel = supabase
    .channel(`user-sessions:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sessions',
      filter
    }, (payload) => {
      callback({
        session: payload.new as Session,
        type: 'status_change'
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
