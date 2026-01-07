// Daily.co API client - Phase 04: Real-time Integration
// Server-side client for room management

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

if (!DAILY_API_KEY) {
  console.warn('DAILY_API_KEY not set - Daily.co integration disabled');
}

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  privacy: 'private' | 'public';
  config?: {
    nbf?: number;
    exp?: number;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
    start_video_off?: boolean;
    start_audio_off?: boolean;
  };
}

export interface DailyParticipant {
  user_id: string;
  user_name: string;
  duration: number;
  joined_at?: string;
}

export interface CreateRoomOptions {
  name: string;
  expiresAt?: Date;
  enableChat?: boolean;
  enableScreenshare?: boolean;
  enableRecording?: boolean;
  maxParticipants?: number;
}

/**
 * Create a new Daily.co room
 */
export async function createRoom(options: CreateRoomOptions): Promise<DailyRoom | null> {
  if (!DAILY_API_KEY) {
    console.error('Daily.co API key not configured');
    return null;
  }

  const {
    name,
    expiresAt,
    enableChat = true,
    enableScreenshare = true,
    enableRecording = false,
    maxParticipants = 2
  } = options;

  const response = await fetch(`${DAILY_API_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_API_KEY}`
    },
    body: JSON.stringify({
      name,
      privacy: 'private',
      properties: {
        enable_chat: enableChat,
        enable_screenshare: enableScreenshare,
        enable_recording: enableRecording ? 'cloud' : undefined,
        exp: expiresAt?.getTime() || Date.now() + 3600000, // 1 hour default
        enable_prejoin_ui: true,
        enable_network_ui: true,
        max_participants: maxParticipants
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to create Daily room: ${error}`);
    throw new Error(`Failed to create Daily room: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get room details by name
 */
export async function getRoom(roomName: string): Promise<DailyRoom | null> {
  if (!DAILY_API_KEY) return null;

  try {
    const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to get room');

    return response.json();
  } catch (error) {
    console.error('Error getting room:', error);
    return null;
  }
}

/**
 * Delete a room
 */
export async function deleteRoom(roomName: string): Promise<boolean> {
  if (!DAILY_API_KEY) return false;

  try {
    const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting room:', error);
    return false;
  }
}

/**
 * Get meeting participants for a room
 */
export async function getMeetingParticipants(roomName: string): Promise<DailyParticipant[]> {
  if (!DAILY_API_KEY) return [];

  try {
    const response = await fetch(`${DAILY_API_URL}/meetings?room=${roomName}`, {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error getting participants:', error);
    return [];
  }
}

/**
 * Create meeting token for secure room access
 */
export function createMeetingToken(
  roomName: string,
  userId: string,
  userName: string,
  isOwner: boolean = false
): { token: string; expiresAt: number } | null {
  const DAILY_SIGNING_KEY = process.env.DAILY_SIGNING_KEY;
  if (!DAILY_SIGNING_KEY) {
    console.warn('DAILY_SIGNING_KEY not set');
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour

  const payload = {
    exp,
    iat: now,
    jti: crypto.randomUUID(),
    user_id: userId,
    user_name: userName,
    room_name: roomName,
    is_owner: isOwner,
    enable_screenshare: true,
    enable_recording: isOwner,
    start_video_off: false,
    start_audio_off: false
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: DAILY_API_KEY?.slice(0, 8) || 'daily'
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', DAILY_SIGNING_KEY)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return {
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
    expiresAt: exp * 1000
  };
}
