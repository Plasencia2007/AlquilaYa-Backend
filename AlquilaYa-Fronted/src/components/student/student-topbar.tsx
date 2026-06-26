'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Heart, History, LogOut, MessageCircle, Search, Settings } from 'lucide-react';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/cn';
import { NotificationBell } from './notification-bell';

const NAV_LINKS = [
  { href: '/',       label: 'Inicio' },
  { href: '/search', label: 'Explorar' },
];

export function StudentTopbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { usuario, cerrarSesion } = useAuth();
  const [query, setQuery] = useState('');

  const inicial      = usuario?.nombre.charAt(0).toUpperCase() ?? '?';
  const primerNombre = usuario?.nombre.split(' ')[0] ?? '';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white px-6 dark:bg-background/95 dark:backdrop-blur">

      {/* Izquierda: logo (móvil) + nav + búsqueda */}
      <div className="flex items-center gap-8">
        <Link href="/" className="shrink-0 text-lg font-black tracking-tighter text-primary md:hidden">
          Alquila<span className="text-foreground">Ya</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'pb-0.5 text-sm font-bold transition-colors',
                  active
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <form onSubmit={handleSearch} className="hidden lg:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por facultad o distrito…"
              className="h-9 w-80 rounded-full border border-border bg-muted/40 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 transition focus:border-primary/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:focus:bg-card"
            />
          </div>
        </form>
      </div>

      {/* Derecha: tema + notis + usuario */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex items-center gap-2.5 border-l border-border pl-4 focus-visible:outline-none">
              {usuario?.avatar ? (
                <img
                  src={usuario.avatar}
                  alt={usuario?.nombre ?? 'Avatar'}
                  referrerPolicy="no-referrer"
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {inicial}
                </span>
              )}
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-tight text-foreground">{primerNombre}</p>
                <p className="text-[11px] text-muted-foreground">Estudiante</p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={12} className="w-56 rounded-2xl p-1.5 shadow-xl">
            <div className="mb-1 flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-3">
              {usuario?.avatar ? (
                <img
                  src={usuario.avatar}
                  alt={usuario?.nombre ?? 'Avatar'}
                  referrerPolicy="no-referrer"
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {inicial}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{usuario?.nombre}</p>
                <p className="truncate text-[11px] text-muted-foreground">{usuario?.correo}</p>
              </div>
            </div>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem asChild>
              <Link href="/student/favorites" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground">
                <Heart className="size-4 text-muted-foreground" /> Mis favoritos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/student/messages" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground">
                <MessageCircle className="size-4 text-muted-foreground" /> Mis contactos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/student/history" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground">
                <History className="size-4 text-muted-foreground" /> Historial
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem asChild>
              <Link href="/student/profile" className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground">
                <Settings className="size-4 text-muted-foreground" /> Mi cuenta
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => cerrarSesion()}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-primary focus:bg-primary/10 focus:text-primary"
            >
              <LogOut className="size-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </header>
  );
}
