---
title: "Phase 03: Frontend Dashboard (Next.js)"
description: "User/expert dashboards, session management, React components"
effort: 24h
phase: 03
parallel-group: A
dependencies: []
status: pending
---

# Phase 03: Frontend Dashboard (Next.js)

## Exclusive File Ownership

```
/web/
  /app/
    /login/
      page.tsx
    /dashboard/
      /user/
        page.tsx
      /expert/
        page.tsx
      /session/
        [id]/
          page.tsx
    layout.tsx
    page.tsx
  /components/
    /ui/               # shadcn/ui components
    /sessions/
      SessionCard.tsx
      SessionList.tsx
    /experts/
      ExpertCard.tsx
      ExpertFilters.tsx
    /video/
      VideoRoom.tsx
    /layout/
      Header.tsx
      Sidebar.tsx
  /lib/
    supabase.ts        # Supabase client
    stripe.ts          # Stripe client
    daily.ts           # Daily.co client
  /hooks/
    useAuth.ts
    useSession.ts
    useRealtime.ts
  /types/
    index.ts           # Frontend-specific types
  package.json
  tailwind.config.ts
```

## Implementation Steps

### 3.1 Project Setup

```bash
npx create-next-app@latest call-an-expert-web --typescript --tailwind --eslint
cd call-an-expert-web
npm install @supabase/supabase-js @stripe/stripe-js @daily-co/daily-js
npm install lucide-react clsx tailwind-merge
```

### 3.2 Supabase Client (lib/supabase.ts)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for TypeScript
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'expert' | 'agency';
};

export type ExpertProfile = {
  id: string;
  user_id: string;
  bio: string | null;
  skills: string[];
  session_rate: number;
  rating: number;
  available: boolean;
};

export type Session = {
  id: string;
  user_id: string;
  expert_id: string | null;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
  context_html: string | null;
  daily_room_name: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

export type SessionWithExpert = Session & {
  expert?: ExpertProfile;
  user?: Profile;
};
```

### 3.3 Auth Hook (hooks/useAuth.ts)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { supabase, type Profile } from '~/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
  };

  const signInWithGithub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${location.origin}/dashboard`
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    profile,
    loading,
    signIn,
    signInWithGithub,
    signOut
  };
}
```

### 3.4 Dashboard Layout (app/layout.tsx)

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '~/components/layout/Header';
import { Sidebar } from '~/components/layout/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Call-an-Expert',
  description: 'Connect with AI experts for 15-minute screen share sessions'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
```

### 3.5 User Dashboard (app/dashboard/user/page.tsx)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { supabase, type SessionWithExpert } from '~/lib/supabase';
import { SessionCard } from '~/components/sessions/SessionCard';
import { ExpertFilters } from '~/components/experts/ExpertFilters';

export default function UserDashboard() {
  const { user, profile, loading } = useAuth();
  const [sessions, setSessions] = useState<SessionWithExpert[]>([]);
  const [availableExperts, setAvailableExperts] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchAvailableExperts();
    }
  }, [user]);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('sessions')
      .select(`
        *,
        expert:expert_profiles(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSessions(data || []);
  };

  const fetchAvailableExperts = async () => {
    const { data } = await supabase
      .from('expert_profiles')
      .select(`
        *,
        user:profiles(full_name, avatar_url)
      `)
      .eq('availability_status', 'online')
      .eq('verified', true)
      .order('rating', { ascending: false });
    setAvailableExperts(data || []);
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button className="btn-primary">
          Find an Expert
        </button>
      </div>

      {/* Active Sessions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Active Sessions</h2>
        <div className="grid gap-4">
          {sessions
            .filter(s => ['pending', 'matched', 'in_progress'].includes(s.status))
            .map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          {sessions.filter(s => s.status !== 'completed').length === 0 && (
            <p className="text-gray-500">No active sessions</p>
          )}
        </div>
      </section>

      {/* Available Experts */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Available Experts</h2>
        <ExpertFilters />
        <div className="grid grid-cols-3 gap-4 mt-4">
          {availableExperts.map(expert => (
            <ExpertCard key={expert.id} expert={expert} />
          ))}
        </div>
      </section>

      {/* Session History */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
        <div className="space-y-2">
          {sessions
            .filter(s => s.status === 'completed')
            .slice(0, 5)
            .map(session => (
              <div key={session.id} className="p-4 bg-white rounded shadow">
                <p className="font-medium">Session with {session.expert?.user?.full_name}</p>
                <p className="text-sm text-gray-500">
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
```

### 3.6 Expert Dashboard (app/dashboard/expert/page.tsx)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { supabase } from '~/lib/supabase';

export default function ExpertDashboard() {
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState({
    todayEarnings: 0,
    weeklySessions: 0,
    rating: 0,
    responseTime: 0
  });
  const [availability, setAvailability] = useState('offline');

  useEffect(() => {
    if (user) {
      fetchExpertStats();
      fetchAvailability();
    }
  }, [user]);

  const fetchExpertStats = async () => {
    const { data } = await supabase
      .from('expert_profiles')
      .select('rating, total_sessions, response_time_avg')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setStats({
        rating: data.rating,
        weeklySessions: data.total_sessions,
        responseTime: data.response_time_avg,
        todayEarnings: 0 // Calculate from payments
      });
    }
  };

  const fetchAvailability = async () => {
    const { data } = await supabase
      .from('expert_profiles')
      .select('availability_status')
      .eq('user_id', user.id)
      .single();
    if (data) setAvailability(data.availability_status);
  };

  const updateAvailability = async (status: string) => {
    await supabase
      .from('expert_profiles')
      .update({ availability_status: status })
      .eq('user_id', user.id);
    setAvailability(status);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      {/* Availability Toggle */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Expert Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Status:</span>
          <select
            value={availability}
            onChange={(e) => updateAvailability(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="online">Online</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Today Earnings" value={`$${(stats.todayEarnings / 100).toFixed(2)}`} />
        <StatCard label="This Week" value={stats.weeklySessions.toString()} />
        <StatCard label="Rating" value={stats.rating.toFixed(1)} />
        <StatCard label="Avg Response" value={`${stats.responseTime}m`} />
      </div>

      {/* Incoming Requests */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Incoming Requests</h2>
        <p className="text-gray-500">No pending requests</p>
      </section>

      {/* Settings */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
        <button className="btn-secondary">Edit Profile</button>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded shadow">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
```

### 3.7 Session Page with Video (app/dashboard/session/[id]/page.tsx)

```tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '~/hooks/useAuth';
import { supabase } from '~/lib/supabase';
import VideoRoom from '~/components/video/VideoRoom';

export default function SessionPage() {
  const params = useParams();
  const { user, profile } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchSession();
      subscribeToMessages();
    }
  }, [params.id]);

  const fetchSession = async () => {
    const { data } = await supabase
      .from('sessions')
      .select(`
        *,
        expert:expert_profiles(*, user:profiles(*)),
        user:profiles(*)
      `)
      .eq('id', params.id)
      .single();
    setSession(data);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`session:${params.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: `session_id=eq.${params.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await supabase.from('session_messages').insert({
      session_id: params.id,
      sender_id: user.id,
      content: newMessage
    });
    setNewMessage('');
  };

  if (!session) return <div>Loading session...</div>;

  return (
    <div className="grid grid-cols-3 gap-4 h-[calc(100vh-100px)]">
      {/* Video Area */}
      <div className="col-span-2">
        <VideoRoom
          roomUrl={`https://your-domain.daily.co/${session.daily_room_name}`}
          onJoined={() => {
            supabase.from('sessions')
              .update({ status: 'in_progress' })
              .eq('id', session.id);
          }}
        />
      </div>

      {/* Chat Sidebar */}
      <div className="bg-white rounded shadow flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Session Chat</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`p-2 rounded ${
                msg.sender_id === user.id
                  ? 'bg-blue-100 ml-auto'
                  : 'bg-gray-100'
              } max-w-[80%]`}
            >
              <p>{msg.content}</p>
              <span className="text-xs text-gray-500">
                {new Date(msg.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 border rounded px-3 py-2"
              placeholder="Type a message..."
            />
            <button
              onClick={sendMessage}
              className="btn-primary"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3.8 Component: Expert Card (components/experts/ExpertCard.tsx)

```tsx
import { Star, MessageCircle } from 'lucide-react';

interface ExpertCardProps {
  expert: {
    id: string;
    bio: string | null;
    skills: string[];
    session_rate: number;
    rating: number;
    user?: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  onSelect?: (expertId: string) => void;
}

export function ExpertCard({ expert, onSelect }: ExpertCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        <img
          src={expert.user?.avatar_url || '/default-avatar.png'}
          alt={expert.user?.full_name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg">
            {expert.user?.full_name || 'Anonymous Expert'}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{expert.rating.toFixed(1)}</span>
            <span className="text-gray-400">|</span>
            <span>${(expert.session_rate / 100).toFixed(0)}/session</span>
          </div>
        </div>
      </div>

      {expert.bio && (
        <p className="mt-4 text-gray-600 line-clamp-2">{expert.bio}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {expert.skills.slice(0, 5).map(skill => (
          <span
            key={skill}
            className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
          >
            {skill}
          </span>
        ))}
      </div>

      <button
        onClick={() => onSelect?.(expert.id)}
        className="mt-4 w-full btn-primary flex items-center justify-center gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        Request Session
      </button>
    </div>
  );
}
```

### 3.9 Video Room Component (components/video/VideoRoom.tsx)

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';

interface VideoRoomProps {
  roomUrl: string;
  onJoined?: () => void;
  onLeft?: () => void;
}

export default function VideoRoom({ roomUrl, onJoined, onLeft }: VideoRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !roomUrl) return;

    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '8px'
      },
      showLeaveButton: true,
      showFullscreenButton: true
    });

    callFrameRef.current = callFrame;

    callFrame.join({ url: roomUrl })
      .then(() => {
        setIsJoined(true);
        onJoined?.();
      })
      .catch((err: Error) => {
        setError(err.message);
      });

    callFrame.on('left-meeting', () => {
      onLeft?.();
    });

    callFrame.on('error', (err: Error) => {
      setError(err.message);
    });

    return () => {
      callFrame.leave();
      callFrame.destroy();
    };
  }, [roomUrl]);

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-8 rounded-lg text-center">
        <p className="font-semibold">Failed to join video call</p>
        <p className="text-sm mt-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 btn-secondary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <div ref={containerRef} className="h-full" />
      {!isJoined && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-white text-center">
            <p className="text-lg">Connecting to session...</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Success Criteria

- [ ] Next.js app runs without errors
- [ ] User dashboard shows sessions and experts
- [ ] Expert dashboard shows availability toggle
- [ ] Session page loads with video component
- [ ] Authentication flow works (GitHub OAuth)
- [ ] No file overlap with other phases

## Conflict Prevention

- Frontend files under `/web/` exclusive
- Types defined in `/web/lib/supabase.ts` (not database schema)
- Extension imports types from `/extensions/src/types/`
