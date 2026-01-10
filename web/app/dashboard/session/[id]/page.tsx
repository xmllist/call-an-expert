'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { useAuth } from '~/hooks/useAuth';
import { useSession } from '~/hooks/useSession';
import { useRealtime } from '~/hooks/useRealtime';
import { VideoRoom } from '~/components/video/VideoRoom';
import { SessionMessage, SessionStatus } from '~/lib/supabase';
import { getInitials, formatDate, formatDuration } from '~/lib/utils';
import { formatPrice } from '~/lib/stripe';
import {
  ArrowLeft,
  Send,
  Paperclip,
  MoreVertical,
  Video,
  Phone,
  Clock,
  Calendar,
  User,
} from 'lucide-react';

const statusConfig: Record<SessionStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  requested: { label: 'Requested', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'success' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  disputed: { label: 'Disputed', variant: 'warning' },
};

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { user, profile } = useAuth();
  const { currentSession, loading: sessionLoading, fetchSession, updateSessionStatus } = useSession();
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (sessionId && isClient) {
      fetchSession(sessionId);
    }
  }, [sessionId, fetchSession, isClient]);

  // Real-time messaging
  const { sendMessage, isConnected } = useRealtime({
    sessionId,
    onMessage: (message) => {
      setMessages((prev) => [...prev, message]);
    },
    onStatusChange: (status) => {
      fetchSession(sessionId);
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      await sendMessage(newMessage, user.id);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleJoinSession = async () => {
    if (!currentSession) return;
    await updateSessionStatus(sessionId, 'in_progress');
  };

  const handleEndSession = async () => {
    if (!currentSession) return;
    await updateSessionStatus(sessionId, 'completed');
  };

  if (sessionLoading || !isClient) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">Session not found</p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[currentSession.status];
  const otherParty = currentSession.expert?.user || currentSession.client;
  const isExpert = profile?.role === 'expert';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentSession.topic || 'Expert Session'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={status.variant}>{status.label}</Badge>
              <span className="text-sm text-muted-foreground">
                {formatDuration(currentSession.duration_minutes)} session
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentSession.status === 'confirmed' && (
            <Button onClick={handleJoinSession}>
              <Video className="mr-2 h-4 w-4" />
              Join Session
            </Button>
          )}
          {currentSession.status === 'in_progress' && (
            <Button variant="destructive" onClick={handleEndSession}>
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 lg:grid-cols-3 h-[calc(100vh-200px)]">
        {/* Video Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden h-full">
            {currentSession.status === 'in_progress' && currentSession.daily_room_url ? (
              <VideoRoom
                roomUrl={currentSession.daily_room_url}
                onJoined={() => console.log('Joined video call')}
                onLeft={() => console.log('Left video call')}
                className="h-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-muted/30">
                <Video className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Ready to start your session</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentSession.status === 'confirmed'
                    ? 'The expert will join when ready'
                    : 'This session has not started yet'}
                </p>
                {currentSession.status === 'confirmed' && (
                  <Button onClick={handleJoinSession}>
                    <Video className="mr-2 h-4 w-4" />
                    Start Session
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Session Info */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDate(currentSession.requested_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDuration(currentSession.duration_minutes)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {isExpert ? 'Client' : 'Expert'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatPrice(currentSession.total_amount_cents)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Sidebar */}
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherParty?.avatar_url || undefined} />
                <AvatarFallback>{getInitials(otherParty?.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">
                  {otherParty?.full_name || 'User'}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {isConnected ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start the conversation</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
