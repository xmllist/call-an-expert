'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase, type SessionMessage } from '~/lib/supabase';

interface UseRealtimeOptions {
  sessionId: string;
  onMessage?: (message: SessionMessage) => void;
  onStatusChange?: (status: string) => void;
}

export function useRealtime({ sessionId, onMessage, onStatusChange }: UseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);

  const subscribeToSession = useCallback(() => {
    if (!sessionId) return;

    // Remove existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as SessionMessage;
          onMessage?.(newMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedSession = payload.new as any;
          if (updatedSession.status) {
            onStatusChange?.(updatedSession.status);
          }
        }
      )
      .subscribe((state) => {
        setIsConnected(state === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onMessage, onStatusChange]);

  const sendMessage = useCallback(async (content: string, senderId: string) => {
    try {
      const { error } = await supabase.from('session_messages').insert({
        session_id: sessionId,
        sender_id: senderId,
        message_type: 'text',
        content,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [sessionId]);

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await supabase
        .from('session_messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }, []);

  useEffect(() => {
    const cleanup = subscribeToSession();
    return () => {
      cleanup?.();
    };
  }, [subscribeToSession]);

  return {
    isConnected,
    sendMessage,
    markAsRead,
    resubscribe: subscribeToSession,
  };
}
