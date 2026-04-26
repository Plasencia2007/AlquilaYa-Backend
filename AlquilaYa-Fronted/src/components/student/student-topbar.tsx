'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, User } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useAuth } from '@/hooks/use-auth';

import { AvatarInitial } from './avatar-initial';
import { NotificationBell } from './notification-bell';

export function StudentTopbar() {
  const router = useRouter();
  const { usuario, cerrarSesion } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <Link href="/" className="text-lg font-black tracking-tighter text-primary md:hidden">
        Alquila<span className="text-foreground">Ya</span>
      </Link>
      <div className="hidden md:block" aria-hidden />

      <div className="flex items-center gap-1.5 md:gap-3">
        <ThemeToggle />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="rounded-full p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Menú de cuenta"
          >
            <AvatarInitial nombre={usuario?.nombre ?? '?'} size="sm" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={10} className="w-56">
            <DropdownMenuLabel className="space-y-0.5 py-2">
              <p className="text-xs font-bold text-foreground">{usuario?.nombre}</p>
              <p className="truncate text-[10px] font-normal text-muted-foreground">
                {usuario?.correo}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/student/profile')}>
              <User className="size-4" aria-hidden /> Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/student/profile?tab=verificacion')}>
              <Settings className="size-4" aria-hidden /> Verificación
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => cerrarSesion()}
              className="text-primary focus:bg-primary/10 focus:text-primary"
            >
              <LogOut className="size-4" aria-hidden /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
