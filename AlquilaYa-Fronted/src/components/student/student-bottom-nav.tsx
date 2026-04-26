'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, MessageCircle, Search, User } from 'lucide-react';

import { cn } from '@/lib/cn';

const tabs = [
  { href: '/student', label: 'Inicio', icon: Home },
  { href: '/search', label: 'Buscar', icon: Search },
  { href: '/student/favorites', label: 'Favoritos', icon: Heart },
  { href: '/student/messages', label: 'Mensajes', icon: MessageCircle },
  { href: '/student/profile', label: 'Cuenta', icon: User },
];

export function StudentBottomNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border bg-background/95 backdrop-blur md:hidden"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const activo =
          tab.href === '/student'
            ? pathname === '/student'
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors',
              activo ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
