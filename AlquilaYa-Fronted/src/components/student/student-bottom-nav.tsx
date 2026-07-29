'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Heart, History, Home, MessageCircle, Search, User } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useUnreadMessagesStore } from '@/stores/unread-messages-store';
import { useNotificationsStore } from '@/stores/notifications-store';

const tabs = [
  { href: '/student', label: 'Inicio', icon: Home },
  { href: '/search', label: 'Buscar', icon: Search },
  { href: '/student/favorites', label: 'Favoritos', icon: Heart },
  { href: '/student/history', label: 'Historial', icon: History },
  { href: '/student/messages', label: 'Mensajes', icon: MessageCircle },
  { href: '/student/notifications', label: 'Alertas', icon: Bell },
  { href: '/student/profile', label: 'Cuenta', icon: User },
];

export function StudentBottomNav() {
  const pathname = usePathname() ?? '';
  const mensajesNoLeidos = useUnreadMessagesStore((s) => s.total);
  const notificacionesNoLeidas = useNotificationsStore((s) => s.noLeidas);

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

        // Ítem 245: badges de no-leídos en Mensajes/Alertas (mismo patrón que
        // `landlord-sidebar.tsx` con `useUnreadMessagesStore`). El aria-label
        // va en el <Link> completo (no solo en el badge visual) para que un
        // lector de pantalla lo anuncie al enfocar el tab.
        let badgeCount = 0;
        let badgeAriaLabel: string | undefined;
        if (tab.href === '/student/messages' && mensajesNoLeidos > 0) {
          badgeCount = mensajesNoLeidos;
          badgeAriaLabel = `${tab.label}, ${badgeCount} mensajes sin leer`;
        } else if (tab.href === '/student/notifications' && notificacionesNoLeidas > 0) {
          badgeCount = notificacionesNoLeidas;
          badgeAriaLabel = `${tab.label}, ${badgeCount} notificaciones sin leer`;
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={badgeAriaLabel}
            aria-current={activo ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors',
              activo ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="relative flex">
              <Icon className="size-5" aria-hidden />
              {badgeCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-1.5 -top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground"
                >
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
