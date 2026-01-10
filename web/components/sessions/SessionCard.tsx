'use client';

import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { formatDate, formatDuration, getInitials } from '~/lib/utils';
import { formatPrice } from '~/lib/stripe';
import { Session, SessionStatus } from '~/lib/supabase';
import {
  Video,
  Clock,
  Calendar,
  MessageCircle,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react';

interface SessionCardProps {
  session: Session & {
    expert?: {
      user?: { full_name: string | null; avatar_url: string | null };
    };
    client?: { full_name: string | null; avatar_url: string | null };
  };
  variant?: 'default' | 'compact' | 'featured';
  onAction?: (action: string) => void;
}

const statusConfig: Record<SessionStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  requested: { label: 'Requested', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'success' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  disputed: { label: 'Disputed', variant: 'warning' },
};

export function SessionCard({ session, variant = 'default', onAction }: SessionCardProps) {
  const status = statusConfig[session.status];
  const otherParty = session.expert?.user || session.client;

  const isActionable = ['requested', 'confirmed'].includes(session.status);
  const isJoinable = session.status === 'in_progress' && session.daily_room_url;

  if (variant === 'compact') {
    return (
      <Link href={`/dashboard/session/${session.id}`} className="block">
        <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherParty?.avatar_url || undefined} />
            <AvatarFallback>{getInitials(otherParty?.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {session.topic || 'Expert Session'}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(session.requested_at)}
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </Link>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherParty?.avatar_url || undefined} />
              <AvatarFallback>{getInitials(otherParty?.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {session.topic || 'Expert Session'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                with {otherParty?.full_name || 'Expert'}
              </p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(session.requested_at)}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(session.duration_minutes)}
          </div>
          <div className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            {formatPrice(session.total_amount_cents)}
          </div>
        </div>

        {session.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {session.notes}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2">
          {isJoinable ? (
            <Button asChild className="flex-1">
              <Link href={`/dashboard/session/${session.id}`}>
                <Video className="mr-2 h-4 w-4" />
                Join Session
              </Link>
            </Button>
          ) : isActionable ? (
            <>
              <Button variant="outline" asChild className="flex-1">
                <Link href={`/dashboard/session/${session.id}`}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message
                </Link>
              </Button>
              {session.status === 'requested' && (
                <Button className="flex-1" asChild>
                  <Link href={`/dashboard/session/${session.id}`}>
                    View Details
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <Button variant="outline" asChild className="w-full">
              <Link href={`/dashboard/session/${session.id}`}>
                View Details
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
