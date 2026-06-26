'use client';

import Link from 'next/link';
import { ChevronDown, Heart, History, LayoutDashboard, LogOut, MessageCircle, Settings, User } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/cn';

export function UserMenu() {
  const { usuario, cerrarSesion } = useAuth();

  if (!usuario) return null;

  const inicial = usuario.nombre.charAt(0).toUpperCase();
  const primerNombre = usuario.nombre.split(' ')[0];
  const primerNombreDisplay = primerNombre.length > 10 ? primerNombre.slice(0, 10) + '…' : primerNombre;
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
        <span className="hidden text-[13px] font-semibold text-foreground sm:inline-block">
          {primerNombreDisplay}
        </span>
        <ChevronDown
          className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-56 rounded-2xl p-1.5 shadow-xl">

        {/* Cabecera de usuario */}
        <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-3 mb-1">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-inner">
            {inicial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{usuario.nombre}</p>
            <p className="truncate text-[11px] text-muted-foreground">{usuario.correo}</p>
          </div>
        </div>

        <DropdownMenuSeparator className="my-1" />

        {esArrendador ? (
          <MenuItem href="/landlord/dashboard" icon={LayoutDashboard} label="Panel de control" />
        ) : (
          <>
            <MenuItem href="/student/favorites"  icon={Heart}          label="Mis favoritos" />
            <MenuItem href="/student/messages"   icon={MessageCircle}  label="Mis contactos" />
            <MenuItem href="/student/history"    icon={History}        label="Historial" />
          </>
        )}

        <DropdownMenuSeparator className="my-1" />

        <MenuItem href="/student/profile" icon={Settings} label="Mi cuenta" />

        <DropdownMenuItem
          onSelect={() => cerrarSesion()}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-primary focus:bg-primary/8 focus:text-primary"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuItem({
  href,
  icon: Icon,
  label,
  className,
}: {
  href: string;
  icon: typeof Heart;
  label: string;
  className?: string;
}) {
  return (
    <DropdownMenuItem asChild>
      <Link
        href={href}
        className={cn(
          'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground focus:bg-muted',
          className,
        )}
      >
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </Link>
    </DropdownMenuItem>
  );
}
