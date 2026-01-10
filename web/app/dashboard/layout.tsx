'use client';

import { Header } from '~/components/layout/Header';
import { Sidebar } from '~/components/layout/Sidebar';
import { useAuth } from '~/hooks/useAuth';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();

  // Determine if user is an expert based on profile or pathname
  const isExpert = pathname?.includes('/expert') || profile?.role === 'expert';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <div className="flex">
        <Sidebar isExpert={isExpert} />
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
