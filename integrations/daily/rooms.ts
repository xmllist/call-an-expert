// Room management functions - Phase 04: Real-time Integration
// High-level room operations

import { createRoom, deleteRoom, getRoom, createMeetingToken } from './client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export interface RoomResult {
  roomName: string;
  roomUrl: string;
  ownerToken: string;
  userToken?: string;
  expiresAt: number;
}

/**
 * Create a video room for a session
 */
export async function createSessionRoom(
  sessionId: string,
  clientId: string,
  expertId: string,
  expiresAt?: Date
): Promise<RoomResult | null> {
  const roomName = `session_${sessionId}`;
  const now = new Date();
  const expiration = expiresAt || new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

  // Create room
  const room = await createRoom({
    name: roomName,
    expiresAt: expiration,
    enableChat: true,
    enableScreenshare: true,
    enableRecording: true,
    maxParticipants: 2
  });

  if (!room) {
    console.error('Failed to create room');
    return null;
  }

  // Get client profile for token
  const { data: clientProfile } = supabase
    ? await supabase.from('profiles').select('full_name').eq('id', clientId).single()
    : { data: { full_name: 'Client' } };

  // Get expert profile for token
  const { data: expertProfile } = supabase
    ? await supabase.from('expert_profiles').select('user_id').eq('id', expertId).single()
    : { data: null };

  const { data: expertUserProfile } = supabase && expertProfile
    ? await supabase.from('profiles').select('full_name').eq('id', expertProfile.user_id).single()
    : { data: { full_name: 'Expert' } };

  // Generate tokens
  const ownerToken = createMeetingToken(
    roomName,
    clientId,
    clientProfile?.full_name || 'Client',
    true
  );

  const userToken = expertProfile
    ? createMeetingToken(
        roomName,
        expertProfile.user_id,
        expertUserProfile?.full_name || 'Expert',
        false
      )
    : undefined;

  // Update session with room info
  if (supabase) {
    await supabase
      .from('sessions')
      .update({
        daily_room_name: roomName,
        daily_room_url: room.url,
        status: 'confirmed'
      })
      .eq('id', sessionId);
  }

  return {
    roomName,
    roomUrl: room.url,
    ownerToken: ownerToken?.token || '',
    userToken: userToken?.token,
    expiresAt: expiration.getTime()
  };
}

/**
 * End a session room
 */
export async function endSessionRoom(sessionId: string): Promise<boolean> {
  const roomName = `session_${sessionId}`;
  return await deleteRoom(roomName);
}

/**
 * Get room info for a session
 */
export async function getSessionRoom(sessionId: string) {
  const roomName = `session_${sessionId}`;
  return await getRoom(roomName);
}

/**
 * Validate room access for a user
 */
export async function validateRoomAccess(
  sessionId: string,
  userId: string
): Promise<boolean> {
  if (!supabase) return false;

  const { data: session } = await supabase
    .from('sessions')
    .select('client_id, expert_id')
    .eq('id', sessionId)
    .single();

  if (!session) return false;

  return session.client_id === userId || session.expert_id === userId;
}
