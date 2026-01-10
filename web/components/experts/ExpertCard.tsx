'use client';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { formatPrice, getStripe } from '~/lib/stripe';
import { getInitials, truncateText } from '~/lib/utils';
import { ExpertProfile } from '~/lib/supabase';
import { Star, Clock, MessageCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface ExpertCardProps {
  expert: ExpertProfile;
  onSelect?: (expertId: string) => void;
  variant?: 'default' | 'compact' | 'featured';
}

export function ExpertCard({ expert, onSelect, variant = 'default' }: ExpertCardProps) {
  const skills = expert.skills?.map(s => s.skill_category?.name || 'Skill').slice(0, 4) || [];

  if (variant === 'compact') {
    return (
      <div
        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => onSelect?.(expert.id)}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={expert.user?.avatar_url || undefined} />
          <AvatarFallback>{getInitials(expert.user?.full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{expert.user?.full_name || 'Expert'}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{expert.rating.toFixed(1)}</span>
            <span>·</span>
            <span>{formatPrice(expert.hourly_rate_cents)}/hr</span>
          </div>
        </div>
        {expert.is_available && (
          <Badge variant="success" className="text-xs">Available</Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-14 w-14">
              <AvatarImage src={expert.user?.avatar_url || undefined} />
              <AvatarFallback>{getInitials(expert.user?.full_name)}</AvatarFallback>
            </Avatar>
            {expert.is_available && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              {expert.user?.full_name || 'Expert'}
              {expert.is_available && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{expert.rating.toFixed(1)}</span>
                <span>({expert.total_sessions})</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{expert.total_hours.toFixed(0)}h</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {expert.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {truncateText(expert.bio, 120)}
          </p>
        )}

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {skills.length >= 4 && expert.skills && expert.skills.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{expert.skills.length - 4} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-lg font-semibold">
            {formatPrice(expert.hourly_rate_cents)}
            <span className="text-sm font-normal text-muted-foreground">/hr</span>
          </div>
          <Button onClick={() => onSelect?.(expert.id)}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Request Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
