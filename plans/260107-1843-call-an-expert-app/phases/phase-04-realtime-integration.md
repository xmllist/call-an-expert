---
title: "Phase 04: Real-time Integration"
description: "Daily.co video rooms + Supabase Realtime presence and subscriptions"
effort: 16h
phase: 04
parallel-group: B
dependencies: ["02"]  # Depends on Supabase schema
status: pending
---

# Phase 04: Real-time Integration

## Exclusive File Ownership

```
/integrations/
  /daily/
    client.ts            # Daily.co API client
    rooms.ts             # Room management functions
    tokens.ts            # Token generation for secure rooms
  /realtime/
    presence.ts          # Online status tracking
    subscriptions.ts     # Session/chat subscriptions
  /webhooks/
    daily-webhook.ts     # Daily.co event handler
  /shared/
    /types/
      video.ts           # Video-related types
```

## Implementation Steps

### 4.1 Daily.co API Client (daily/client.ts)

```typescript
// Server-side Daily.co client
const DAILY_API_KEY = process.env.DAILY_API_KEY!;
const DAILY_API_URL = 'https://api.daily.co/v1';

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  privacy: 'private' | 'public';
  config?: {
    nbf?: number;          // Not before (timestamp)
    exp?: number;          // Expiration (timestamp)
    enable_chat?: boolean;
    enable_screenshare?: boolean;
    start_video_off?: boolean;
    start_audio_off?: boolean;
  };
}

interface DailyParticipant {
  user_id: string;
  user_name: string;
  duration: number;
}

export async function createRoom(roomName: string, expiresAt?: Date): Promise<DailyRoom> {
  const response = await fetch(`${DAILY_API_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_API_KEY}`
    },
    body: JSON.stringify({
      name: roomName,
      privacy: 'private',
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: 'cloud',  // Optional: record sessions
        exp: expiresAt?.getTime() || Date.now() + 3600000, // 1 hour default
        enable_prejoin_ui: true,
        enable_network_ui: true,
        max_participants: 2
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create Daily room: ${response.statusText}`);
  }

  return response.json();
}

export async function getRoom(roomName: string): Promise<DailyRoom | null> {
  const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`
    }
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to get room');

  return response.json();
}

export async function deleteRoom(roomName: string): Promise<void> {
  const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete room');
  }
}

export async function getMeetingParticipants(roomName: string): Promise<DailyParticipant[]> {
  const response = await fetch(`${DAILY_API_URL}/meetings?room=${roomName}`, {
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`
    }
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}
```

### 4.2 Secure Token Generation (daily/tokens.ts)

```typescript
import crypto from 'crypto';

const DAILY_API_KEY = process.env.DAILY_API_KEY!;
const DAILY_SIGNING_KEY = process.env.DAILY_SIGNING_KEY!;

interface MeetingToken {
  token: string;
  expiresAt: number;
}

export function createMeetingToken(
  roomName: string,
  userId: string,
  userName: string,
  isOwner: boolean = false
): MeetingToken {
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
    enable_recording: isOwner, // Only owner can record
    start_video_off: false,
    start_audio_off: false
  };

  // Create JWT token (simplified - use jsonwebtoken in production)
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: DAILY_API_KEY.slice(0, 8)
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
```

### 4.3 Supabase Edge Functions for Room Management

#### create-room.sql

```sql
CREATE OR REPLACE FUNCTION create_video_room(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS TABLE (room_url TEXT, room_token TEXT, expires_at BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_name TEXT;
  v_room_url TEXT;
  v_session RECORD;
  v_expert_profile RECORD;
  v_user_profile RECORD;
  v_owner_token TEXT;
  v_user_token TEXT;
BEGIN
  -- Get session details
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;

  -- Get user profile
  SELECT * INTO v_user_profile FROM public.profiles WHERE id = p_user_id;

  -- Get expert profile if assigned
  SELECT * INTO v_expert_profile
  FROM public.expert_profiles
  WHERE id = v_session.expert_id;

  -- Generate room name
  v_room_name := 'session_' || p_session_id::TEXT;

  -- Create room (call external API or use Daily SDK)
  -- This would typically call the Daily.co API
  PERFORM create_daily_room(v_room_name);

  -- Get room URL
  v_room_url := 'https://your-domain.daily.co/' || v_room_name;

  -- Generate owner token (for the session creator)
  v_owner_token := create_meeting_token(v_room_name, p_user_id, v_user_profile.full_name, true);

  -- Generate user token for expert
  IF v_expert_profile.user_id IS NOT NULL THEN
    SELECT full_name INTO v_user_profile
    FROM public.profiles WHERE id = v_expert_profile.user_id;
    v_user_token := create_meeting_token(v_room_name, v_expert_profile.user_id, v_user_profile, false);
  ELSE
    v_user_token := NULL;
  END IF;

  -- Update session with room info
  UPDATE public.sessions
  SET
    daily_room_name = v_room_name,
    daily_room_url = v_room_url,
    updated_at = NOW()
  WHERE id = p_session_id;

  RETURN QUERY SELECT v_room_url, v_owner_token, (NOW() + INTERVAL '1 hour')::BIGINT;
END;
$$;
```

### 4.4 Supabase Realtime Presence (realtime/presence.ts)

```typescript
// Client-side presence tracking
import { createClient, type Channel, type PresenceState } from '@supabase/supabase-js';
import { supabase } from '~/lib/supabase';

interface OnlineUser {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  role: 'user' | 'expert';
  status: 'online' | 'busy';
}

const ONLINE_CHANNEL = 'online-users';

export async function trackOnlineStatus(
  userId: string,
  status: 'online' | 'busy' | 'offline'
): Promise<void> {
  // Update database
  await supabase.from('online_status').upsert({
    user_id: userId,
    status,
    last_seen: new Date().toISOString()
  });

  // Track in realtime channel
  const channel = supabase.channel(ONLINE_CHANNEL);

  if (status === 'online') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', userId)
      .single();

    await channel.track({
      userId,
      fullName: profile?.full_name || 'Anonymous',
      role: profile?.role,
      online_at: new Date().toISOString()
    });
  } else {
    await channel.untrack();
  }
}

export function subscribeToOnlineUsers(
  callback: (users: OnlineUser[]) => void
): () => void {
  const channel = supabase
    .channel(ONLINE_CHANNEL)
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: OnlineUser[] = [];

      Object.values(state).forEach((presences: any) => {
        if (presences.length > 0) {
          const presence = presences[0];
          users.push({
            userId: presence.userId,
            fullName: presence.fullName,
            role: presence.role,
            status: 'online'
          });
        }
      });

      callback(users);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Get current user's profile info
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();

          await channel.track({
            userId: user.id,
            fullName: profile?.full_name || 'Anonymous',
            role: profile?.role || 'user',
            online_at: new Date().toISOString()
          });
        }
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
```

### 4.5 Session Realtime Subscriptions (realtime/subscriptions.ts)

```typescript
import { supabase, type Session } from '~/lib/supabase';

type SessionUpdateCallback = (session: Session) => void;

export function subscribeToSession(
  sessionId: string,
  callbacks: {
    onStatusChange?: SessionUpdateCallback;
    onMessage?: (message: any) => void;
    onParticipantJoin?: (participant: any) => void;
    onParticipantLeave?: (participant: any) => void;
  }
): () => void {
  const channel = supabase.channel(`session:${sessionId}`);

  // Session status updates
  channel
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'sessions',
      filter: `id=eq.${sessionId}`
    }, (payload) => {
      callbacks.onStatusChange?.(payload.new as Session);
    })
    .subscribe();

  // Chat messages
  channel
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'session_messages',
      filter: `session_id=eq.${sessionId}`
    }, (payload) => {
      callbacks.onMessage?.(payload.new);
    })
    .subscribe();

  // Expert status changes (for availability updates)
  channel
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'expert_profiles',
      filter: `availability_status=eq.online`
    }, (payload) => {
      // Notify user if expert comes online
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPendingRequests(
  expertId: string,
  callback: (session: Session) => void
): () => void {
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
```

### 4.6 Daily.co Webhook Handler (webhooks/daily-webhook.ts)

```typescript
// This would be an Edge Function or API route
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface DailyWebhookPayload {
  event: 'meeting-started' | 'meeting-ended' | 'participant-joined' | 'participant-left';
  meeting_id: string;
  meeting_name: string;
  participant?: {
    user_id: string;
    user_name: string;
    duration: number;
  };
  timestamp: number;
}

serve(async (req: Request) => {
  const payload: DailyWebhookPayload = await req.json();

  // Verify webhook signature
  const signature = req.headers.get('x-daily-signature');
  if (!verifyDailySignature(payload, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

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
  }

  return new Response('OK', { status: 200 });
});

async function handleMeetingStarted(payload: DailyWebhookPayload) {
  // Update session status to in_progress
  const sessionId = payload.meeting_name.replace('session_', '');

  await supabase
    .from('sessions')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .eq('id', sessionId);
}

async function handleMeetingEnded(payload: DailyWebhookPayload) {
  // Calculate duration and update session
  const sessionId = payload.meeting_name.replace('session_', '');

  const { data: session } = await supabase
    .from('sessions')
    .select('started_at')
    .eq('id', sessionId)
    .single();

  if (session?.started_at) {
    const duration = Math.round(
      (payload.timestamp - new Date(session.started_at).getTime() / 1000) / 60
    );

    await supabase
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_minutes: duration
      })
      .eq('id', sessionId);
  }
}

async function handleParticipantJoined(payload: DailyWebhookPayload) {
  // Log participant join for analytics
  console.log(`Participant joined: ${payload.participant?.user_name}`);
}

async function handleParticipantLeft(payload: DailyWebhookPayload) {
  // Check if both participants left, end meeting
  const roomName = payload.meeting_name;
  // Could check participant count and auto-end if 0
}

function verifyDailySignature(payload: any, signature: string | null): boolean {
  // Implement Daily.co webhook signature verification
  // https://docs.daily.co/reference/webhooks#verifying-webhook-requests
  return true; // Placeholder
}
```

### 4.7 Frontend Hook for Video Calls (hooks/useVideoRoom.ts)

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';

interface UseVideoRoomOptions {
  roomUrl: string;
  token?: string;
  onJoined?: () => void;
  onLeft?: () => void;
  onError?: (error: Error) => void;
}

export function useVideoRoom({
  roomUrl,
  token,
  onJoined,
  onLeft,
  onError
}: UseVideoRoomOptions) {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [callFrame, setCallFrame] = useState<DailyCall | null>(null);

  const join = useCallback(async () => {
    if (!roomUrl) return;

    try {
      const daily = DailyIframe.createFrame(
        document.createElement('div') // Hidden frame for audio-only
      );

      await daily.join({
        url: roomUrl,
        token,
        showLeaveButton: false,
        showFullscreenButton: true
      });

      setCallFrame(daily);
      setIsJoined(true);
      onJoined?.();
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [roomUrl, token, onJoined, onError]);

  const leave = useCallback(() => {
    if (callFrame) {
      callFrame.leave();
      callFrame.destroy();
      setCallFrame(null);
      setIsJoined(false);
      onLeft?.();
    }
  }, [callFrame, onLeft]);

  const startScreenShare = useCallback(async () => {
    if (callFrame && isJoined) {
      await callFrame.startScreenShare();
    }
  }, [callFrame, isJoined]);

  const stopScreenShare = useCallback(async () => {
    if (callFrame && isJoined) {
      await callFrame.stopScreenShare();
    }
  }, [callFrame, isJoined]);

  const toggleAudio = useCallback(() => {
    if (callFrame && isJoined) {
      const audioOn = callFrame.isAudioOn();
      audioOn ? callFrame.muteAudio() : callFrame.unmuteAudio();
    }
  }, [callFrame, isJoined]);

  const toggleVideo = useCallback(() => {
    if (callFrame && isJoined) {
      const videoOn = callFrame.isVideoOn();
      videoOn ? callFrame.stopVideo() : callFrame.startVideo();
    }
  }, [callFrame, isJoined]);

  useEffect(() => {
    return () => {
      if (callFrame) {
        callFrame.leave();
        callFrame.destroy();
      }
    };
  }, [callFrame]);

  return {
    isJoined,
    isLoading,
    error,
    participants,
    join,
    leave,
    startScreenShare,
    stopScreenShare,
    toggleAudio,
    toggleVideo
  };
}
```

## Success Criteria

- [ ] Daily.co rooms created and deleted programmatically
- [ ] Secure tokens generated for room access
- [ ] Online status synced via Supabase Realtime
- [ ] Session updates reflected in real-time
- [ ] Webhooks handle meeting start/end events
- [ ] No file overlap with other phases

## Conflict Prevention

- Integration files under `/integrations/` exclusive
- Webhooks don't modify other phase files
- Frontend hooks in `/web/hooks/` (Phase 03) import from here
