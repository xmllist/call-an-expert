'use client';

import { useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { useAuth } from '~/hooks/useAuth';
import { supabase, type ExpertProfile } from '~/lib/supabase';
import { getInitials } from '~/lib/utils';
import { formatPrice } from '~/lib/stripe';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  DollarSign,
  Star,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Settings,
  Video,
} from 'lucide-react';
import Link from 'next/link';

interface ExpertStats {
  todayEarnings: number;
  weeklySessions: number;
  rating: number;
  totalSessions: number;
  responseTime: number;
}

export default function ExpertDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(null);
  const [stats, setStats] = useState<ExpertStats>({
    todayEarnings: 0,
    weeklySessions: 0,
    rating: 0,
    totalSessions: 0,
    responseTime: 0,
  });
  const [isClient, setIsClient] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (user && isClient) {
      fetchExpertProfile();
    }
  }, [user, isClient]);

  const fetchExpertProfile = async () => {
    if (!user) return;

    try {
      // Get expert profile
      const { data: expertData, error: expertError } = await supabase
        .from('expert_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (expertError) throw expertError;
      setExpertProfile(expertData);

      // Calculate stats (simplified - would come from backend in production)
      setStats({
        todayEarnings: 0,
        weeklySessions: expertData.total_sessions || 0,
        rating: expertData.rating || 0,
        totalSessions: expertData.total_sessions || 0,
        responseTime: 5, // Mock response time
      });
    } catch (error) {
      console.error('Error fetching expert profile:', error);
    }
  };

  const updateAvailability = async (isAvailable: boolean) => {
    if (!expertProfile) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('expert_profiles')
        .update({ is_available: isAvailable })
        .eq('id', expertProfile.id);

      if (error) throw error;

      setExpertProfile(prev => prev ? { ...prev, is_available: isAvailable } : null);
    } catch (error) {
      console.error('Error updating availability:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || !isClient) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground mb-4">Please sign in to view your dashboard</p>
        <Button asChild>
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  if (!expertProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-muted-foreground">You don't have an expert profile yet</p>
        <Button asChild>
          <Link href="/become-expert">Create Expert Profile</Link>
        </Button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Today\'s Earnings',
      value: formatPrice(stats.todayEarnings),
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      title: 'This Week',
      value: stats.weeklySessions.toString(),
      icon: Calendar,
      color: 'text-blue-500',
    },
    {
      title: 'Rating',
      value: stats.rating.toFixed(1),
      icon: Star,
      color: 'text-yellow-500',
    },
    {
      title: 'Total Sessions',
      value: stats.totalSessions.toString(),
      icon: Video,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">Expert Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name || 'Expert'}!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select
              value={expertProfile.is_available ? 'available' : 'unavailable'}
              onValueChange={(value) => updateAvailability(value === 'available')}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/expert/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Incoming Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Incoming Requests
            </CardTitle>
            <CardDescription>
              Requests waiting for your response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending requests</p>
              <p className="text-sm text-muted-foreground mt-1">
                Enable your status to receive requests
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks and actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/expert/sessions">
                <Video className="mr-2 h-4 w-4" />
                View My Sessions
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/expert/earnings">
                <DollarSign className="mr-2 h-4 w-4" />
                View Earnings
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/expert/settings">
                <Settings className="mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Overview</CardTitle>
          <CardDescription>
            Your public profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Hourly Rate</label>
              <p className="text-lg font-semibold">
                {formatPrice(expertProfile.hourly_rate_cents)}/hr
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Hours</label>
              <p className="text-lg font-semibold">{expertProfile.total_hours.toFixed(1)}h</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Years of Experience</label>
              <p className="text-lg font-semibold">
                {expertProfile.years_experience || 'Not specified'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Bio</label>
              <p className="text-lg font-semibold">
                {expertProfile.bio || 'No bio added yet'}
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/expert/settings">Edit Profile</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
