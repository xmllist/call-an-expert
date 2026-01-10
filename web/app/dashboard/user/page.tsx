'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useAuth } from '~/hooks/useAuth';
import { useSession } from '~/hooks/useSession';
import { useExpert } from '~/hooks/useExpert';
import { SessionCard } from '~/components/sessions/SessionCard';
import { ExpertCard } from '~/components/experts/ExpertCard';
import { ExpertFilters } from '~/components/experts/ExpertFilters';
import { Session } from '~/lib/supabase';
import { Video, Users, Plus, Clock, ArrowRight } from 'lucide-react';

export default function UserDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { sessions, loading: sessionsLoading, fetchSessions } = useSession();
  const { experts, loading: expertsLoading, fetchExperts } = useExpert();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchExperts();
    }
  }, [user, fetchSessions, fetchExperts]);

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

  const activeSessions = sessions.filter((s: Session) =>
    ['requested', 'confirmed', 'in_progress'].includes(s.status)
  );
  const completedSessions = sessions.filter((s: Session) => s.status === 'completed');
  const availableExperts = experts.filter((e) => e.is_available);

  const stats = [
    {
      title: 'Active Sessions',
      value: activeSessions.length,
      icon: Video,
      color: 'text-blue-500',
    },
    {
      title: 'Completed',
      value: completedSessions.length,
      icon: Clock,
      color: 'text-green-500',
    },
    {
      title: 'Available Experts',
      value: availableExperts.length,
      icon: Users,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || 'there'}!
          </p>
        </div>
        <Button asChild>
          <Link href="/experts">
            <Plus className="mr-2 h-4 w-4" />
            Find an Expert
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
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

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">My Sessions</TabsTrigger>
          <TabsTrigger value="experts">Find Experts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Sessions</h2>
          </div>

          {activeSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No active sessions</p>
                <Button asChild>
                  <Link href="/experts">Find an Expert</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeSessions.slice(0, 3).map((session: Session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="experts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Available Experts</h2>
          </div>

          <ExpertFilters onFilterChange={() => {}} />

          {expertsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto" />
            </div>
          ) : availableExperts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No experts available right now</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableExperts.slice(0, 6).map((expert) => (
                <ExpertCard
                  key={expert.id}
                  expert={expert}
                  onSelect={(id) => {
                    console.log('Selected expert:', id);
                  }}
                />
              ))}
            </div>
          )}

          {availableExperts.length > 6 && (
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link href="/experts">
                  View All Experts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h2 className="text-xl font-semibold">Session History</h2>

          {completedSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No completed sessions yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedSessions.slice(0, 10).map((session: Session) => (
                <SessionCard key={session.id} session={session} variant="compact" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
