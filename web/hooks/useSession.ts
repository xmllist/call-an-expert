'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, type Session, type SessionWithDetails, type SessionStatus } from '~/lib/supabase';
import { useAuth } from './useAuth';

interface UseSessionReturn {
  sessions: Session[];
  currentSession: SessionWithDetails | null;
  loading: boolean;
  error: string | null;
  fetchSessions: () => Promise<void>;
  fetchSession: (sessionId: string) => Promise<void>;
  createSession: (expertId: string, topic: string, durationMinutes: number) => Promise<Session | null>;
  updateSessionStatus: (sessionId: string, status: SessionStatus) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(`
          *,
          client:profiles!client_id(*),
          expert:expert_profiles(*, user:profiles!user_id(full_name, avatar_url))
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSessions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(`
          *,
          client:profiles!client_id(*),
          expert:expert_profiles(*, user:profiles!user_id(full_name, avatar_url)),
          messages:session_messages(*, sender:profiles!sender_id(full_name, avatar_url))
        `)
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      // Sort messages by created_at
      if (data.messages) {
        data.messages.sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      setCurrentSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (
    expertId: string,
    topic: string,
    durationMinutes: number
  ): Promise<Session | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // First, get expert profile to calculate rates
      const { data: expert, error: expertError } = await supabase
        .from('expert_profiles')
        .select('hourly_rate_cents')
        .eq('id', expertId)
        .single();

      if (expertError) throw expertError;

      const totalAmount = Math.round(expert.hourly_rate_cents * (durationMinutes / 60));
      const commission = Math.round(totalAmount * 0.1);
      const expertPayout = totalAmount - commission;

      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert({
          client_id: user.id,
          expert_id: expertId,
          topic,
          duration_minutes: durationMinutes,
          session_rate_cents: expert.hourly_rate_cents,
          total_amount_cents: totalAmount,
          commission_amount_cents: commission,
          expert_payout_cents: expertPayout,
          status: 'requested',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSessions(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateSessionStatus = useCallback(async (sessionId: string, status: SessionStatus) => {
    try {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ status })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, status } : s))
      );

      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
    }
  }, [currentSession]);

  const cancelSession = useCallback(async (sessionId: string) => {
    await updateSessionStatus(sessionId, 'cancelled');
  }, [updateSessionStatus]);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, fetchSessions]);

  return {
    sessions,
    currentSession,
    loading,
    error,
    fetchSessions,
    fetchSession,
    createSession,
    updateSessionStatus,
    cancelSession,
  };
}
