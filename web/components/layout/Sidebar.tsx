'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '~/lib/utils';
import { Separator } from '~/components/ui/separator';
import {
  LayoutDashboard,
  Video,
  Users,
  Settings,
  CreditCard,
  LogOut,
} from 'lucide-react';

const userNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/sessions', label: 'My Sessions', icon: Video },
  { href: '/experts', label: 'Find Experts', icon: Users },
];

const expertNavItems = [
  { href: '/dashboard/expert', label: 'Expert Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/expert/sessions', label: 'My Sessions', icon: Video },
  { href: '/dashboard/expert/earnings', label: 'Earnings', icon: CreditCard },
];

const bottomNavItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isExpert?: boolean;
}

export function Sidebar({ isExpert = false }: SidebarProps) {
  const pathname = usePathname();
  const navItems = isExpert ? expertNavItems : userNavItems;

  return (
    <aside className="hidden lg:block w-64 border-r bg-muted/30 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col py-4 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4" />

        <nav className="space-y-1 mt-auto">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
