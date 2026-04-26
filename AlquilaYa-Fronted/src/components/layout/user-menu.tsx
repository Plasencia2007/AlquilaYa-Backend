'use client';

import Link from 'next/link';
import { ChevronDown, Heart, History, LayoutDashboard, LogOut, MessageCircle, User } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';

export function UserMenu() {
  const { usuario, cerrarSesion } = useAuth();

  if (!usuario) return null;

  const inicial = usuario.nombre.charAt(0).toUpperCase();
  const primerNombre = usuario.nombre.split(' ')[0].toUpperCase();
  const esArrendador = usuario.rol === 'ARRENDADOR';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Abrir menú de usuario"
      >
        <span
          className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-inner"
          aria-hidden
        >
          {inicial}
        </span>
        <span className="hidden text-[10px] font-black tracking-widest text-foreground sm:inline-block">
          {primerNombre}
        </span>
        <ChevronDown
          className="size-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="space-y-0.5 py-2">
          <p className="text-xs font-bold text-foreground">{usuario.nombre}</p>
          <p className="truncate text-[10px] font-normal text-muted-foreground">{usuario.correo}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {esArrendador ? (
          <DropdownMenuItem asChild>
            <Link
              href="/landlord/dashboard"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            >
              <LayoutDashboard className="size-4" /> Panel de control
            </Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link
                href="/student/favorites"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
              >
                <Heart className="size-4" /> Mis favoritos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/student/messages"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
              >
                <MessageCircle className="size-4" /> Mis contactos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/student/history"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
              >
                <History className="size-4" /> Historial
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <User className="size-4" /> Mi cuenta
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => cerrarSesion()}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary focus:bg-primary/10 focus:text-primary"
        >
          <LogOut className="size-4" /> Salir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
