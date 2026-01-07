// Online status tracking - Phase 04: Real-time Integration
// Supabase Realtime presence for online indicators

import { createClient, type Channel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface OnlineUser {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  role: 'client' | 'expert' | 'agency_admin';
  status: 'online' | 'busy';
  onlineAt: string;
}

const ONLINE_CHANNEL = 'online-users';

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Track user's online status
 */
export async function trackOnlineStatus(
  userId: string,
  status: 'online' | 'busy' | 'offline'
): Promise<void> {
  if (!supabase) return;

  // Update database
  await supabase.from('online_status').upsert({
    user_id: userId,
    is_online: status !== 'offline',
    last_seen_at: new Date().toISOString()
  });

  // Track in realtime channel
  const channel = supabase.channel(ONLINE_CHANNEL);

  if (status === 'online') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, avatar_url')
      .eq('id', userId)
      .single();

    await channel.track({
      userId,
      fullName: profile?.full_name || 'Anonymous',
      role: profile?.role || 'client',
      avatarUrl: profile?.avatar_url,
      onlineAt: new Date().toISOString()
    });
  } else {
    await channel.untrack();
  }
}

/**
 * Subscribe to online users updates
 */
export function subscribeToOnlineUsers(
  callback: (users: OnlineUser[]) => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(ONLINE_CHANNEL)
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: OnlineUser[] = [];

      Object.values(state).forEach((presences: unknown) => {
        const presenceList = presences as Array<{
          userId: string;
          fullName: string;
          role: string;
          avatarUrl?: string;
          onlineAt: string;
        }>;
        if (presenceList.length > 0) {
          const presence = presenceList[0];
          users.push({
            userId: presence.userId,
            fullName: presence.fullName,
            avatarUrl: presence.avatarUrl,
            role: presence.role as OnlineUser['role'],
            status: 'online',
            onlineAt: presence.onlineAt
          });
        }
      });

      callback(users);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role, avatar_url')
            .eq('id', user.id)
            .single();

          await channel.track({
            userId: user.id,
            fullName: profile?.full_name || 'Anonymous',
            role: profile?.role || 'client',
            avatarUrl: profile?.avatar_url,
            onlineAt: new Date().toISOString()
          });
        }
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to specific expert's online status
 */
export function subscribeToExpertStatus(
  expertId: string,
  callback: (isOnline: boolean) => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`expert:${expertId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'online_status',
      filter: `user_id=eq.${expertId}`
    }, (payload) => {
      const status = payload.new as { is_online?: boolean };
      callback(status?.is_online || false);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}