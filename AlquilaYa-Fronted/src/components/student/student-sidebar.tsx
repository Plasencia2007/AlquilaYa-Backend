'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bookmark,
  ClipboardList,
  Heart,
  History,
  Home,
  LifeBuoy,
  LogOut,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/cn';

interface SidebarItem {
  href: string;
  icon: LucideIcon;
  label: string;
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
      { href: '/student/saved-searches', icon: Bookmark, label: 'Búsquedas guardadas' },
      { href: '/student/roommates', icon: Users, label: 'Compañeros' },
      { href: '/student/groups', icon: UsersRound, label: 'Mis grupos' },
      { href: '/student/reservations', icon: ClipboardList, label: 'Mis reservas' },
      { href: '/student/history', icon: History, label: 'Historial' },
    ],
  },
  {
    label: 'Comunicación',
    items: [
      { href: '/student/messages', icon: MessageCircle, label: 'Mensajes' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { href: '/student/profile', icon: User, label: 'Mi perfil' },
      { href: '/student/ayuda', icon: LifeBuoy, label: 'Ayuda' },
    ],
  },
];

// Ítem 246: preferencia de colapso persistida en localStorage (lazy init de
// useState, sin store de zustand — es un detalle puramente visual de este
// componente, no estado compartido con el resto de la app).
const SIDEBAR_COLLAPSE_KEY = 'student-sidebar-collapsed';

export function StudentSidebar() {
  const pathname = usePathname() ?? '';
  const { cerrarSesion } = useAuth();
  const [colapsado, setColapsado] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
  });

  const alternarColapso = () => {
    setColapsado((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex',
        colapsado ? 'w-[76px]' : 'w-[260px]',
      )}
    >
      <div
        className={cn(
          'flex h-16 items-center border-b border-border',
          colapsado ? 'justify-center px-2' : 'justify-between px-6',
        )}
      >
        {!colapsado && (
          <Link href="/" className="text-xl font-black tracking-tighter text-primary">
            Alquila<span className="text-foreground">Ya</span>
          </Link>
        )}
        <button
          type="button"
          onClick={alternarColapso}
          title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
          aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {colapsado ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden />
          )}
        </button>
      </div>

      <nav aria-label="Navegación de estudiante" className="flex-1 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.label} className="mb-6 last:mb-0">
            {!colapsado && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const activo =
                  item.href === '/student'
                    ? pathname === '/student'
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={activo ? 'page' : undefined}
                      title={colapsado ? item.label : undefined}
                      aria-label={colapsado ? item.label : undefined}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                        colapsado && 'justify-center px-0',
                        activo
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {!colapsado && <span className="flex-1">{item.label}</span>}
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
          title={colapsado ? 'Cerrar sesión' : undefined}
          aria-label={colapsado ? 'Cerrar sesión' : undefined}
          className={cn(
            'w-full gap-3 px-3 text-sm font-semibold text-muted-foreground hover:text-primary',
            colapsado ? 'justify-center px-0' : 'justify-start',
          )}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {!colapsado && 'Cerrar sesión'}
        </Button>
      </div>
    </aside>
  );
}
