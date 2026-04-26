'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ClipboardList,
  Heart,
  History,
  Home,
  LogOut,
  MessageCircle,
  Search,
  User,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useNotificationsStore } from '@/stores/notifications-store';
import { cn } from '@/lib/cn';

interface SidebarItem {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: 'no-leidas';
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

const sections: SidebarSection[] = [
  {
    label: 'Principal',
    items: [
      { href: '/student', icon: Home, label: 'Inicio' },
      { href: '/search', icon: Search, label: 'Buscar cuartos' },
    ],
  },
  {
    label: 'Mi actividad',
    items: [
      { href: '/student/favorites', icon: Heart, label: 'Favoritos' },
      { href: '/student/reservations', icon: ClipboardList, label: 'Mis reservas' },
      { href: '/student/history', icon: History, label: 'Historial' },
    ],
  },
  {
    label: 'Comunicación',
    items: [
      { href: '/student/messages', icon: MessageCircle, label: 'Mensajes' },
      {
        href: '/student/notifications',
        icon: Bell,
        label: 'Notificaciones',
        badge: 'no-leidas',
      },
    ],
  },
  {
    label: 'Cuenta',
    items: [{ href: '/student/profile', icon: User, label: 'Mi perfil' }],
  },
];

export function StudentSidebar() {
  const pathname = usePathname() ?? '';
  const { cerrarSesion } = useAuth();
  const noLeidas = useNotificationsStore((s) => s.noLeidas);

  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/" className="text-xl font-black tracking-tighter text-primary">
          Alquila<span className="text-foreground">Ya</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.label} className="mb-6 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const activo =
                  item.href === '/student'
                    ? pathname === '/student'
                    : pathname.startsWith(item.href);
                const showBadge = item.badge === 'no-leidas' && noLeidas > 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                        activo
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {noLeidas > 9 ? '9+' : noLeidas}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cerrarSesion()}
          className="w-full justify-start gap-3 px-3 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <LogOut className="size-4" aria-hidden /> Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
