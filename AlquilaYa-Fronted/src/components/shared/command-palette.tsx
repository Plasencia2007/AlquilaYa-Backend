'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  ClipboardList,
  FileWarning,
  Heart,
  Home,
  LayoutDashboard,
  LogIn,
  Mail,
  MessageCircle,
  Moon,
  PlusCircle,
  Search,
  Sun,
  User,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { useCommandPaletteStore } from '@/stores/command-palette-store';
import { useThemeStore } from '@/stores/theme-store';

interface Accion {
  label: string;
  icon: typeof Home;
  onSelect: () => void;
  atajo?: string;
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[18px] items-center justify-center rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
      {children}
    </kbd>
  );
}

/**
 * Command palette global (Ctrl/⌘+K) — ítem 49 de MEJORAS.md. Las acciones
 * cambian según el rol de la sesión actual.
 */
export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const toggle = useCommandPaletteStore((s) => s.toggle);
  const router = useRouter();
  const { usuario, estaAutenticado } = useAuth();
  const { open: abrirAuthModal } = useAuthModal();
  const { preference, setPreference } = useThemeStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggle]);

  const ir = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const navegacion: Accion[] = [
    { label: 'Inicio', icon: Home, onSelect: () => ir('/') },
    { label: 'Explorar cuartos', icon: Search, onSelect: () => ir('/search') },
  ];

  const sesion: Accion[] = !estaAutenticado
    ? [
        { label: 'Iniciar sesión', icon: LogIn, onSelect: () => { setOpen(false); abrirAuthModal('login'); } },
        { label: 'Crear cuenta', icon: UserPlus, onSelect: () => ir('/register') },
      ]
    : usuario?.rol === 'ESTUDIANTE'
      ? [
          { label: 'Mi panel', icon: LayoutDashboard, onSelect: () => ir('/student') },
          { label: 'Mis favoritos', icon: Heart, onSelect: () => ir('/student/favorites') },
          { label: 'Mis reservas', icon: ClipboardList, onSelect: () => ir('/student/reservations') },
          { label: 'Mensajes', icon: MessageCircle, onSelect: () => ir('/student/messages') },
          { label: 'Notificaciones', icon: Bell, onSelect: () => ir('/student/notifications') },
          { label: 'Mi perfil', icon: User, onSelect: () => ir('/student/profile') },
        ]
      : usuario?.rol === 'ARRENDADOR'
        ? [
            { label: 'Mi panel', icon: LayoutDashboard, onSelect: () => ir('/landlord/dashboard') },
            { label: 'Mis propiedades', icon: Building2, onSelect: () => ir('/landlord/properties/active') },
            { label: 'Publicar propiedad', icon: PlusCircle, onSelect: () => ir('/landlord/properties/add') },
            { label: 'Reservas', icon: ClipboardList, onSelect: () => ir('/landlord/reservations/active') },
            { label: 'Mensajes', icon: MessageCircle, onSelect: () => ir('/landlord/messages/students') },
            { label: 'Finanzas', icon: Wallet, onSelect: () => ir('/landlord/finances/monthly') },
          ]
        : usuario?.rol === 'ADMIN'
          ? [
              { label: 'Panel admin', icon: LayoutDashboard, onSelect: () => ir('/admin-master') },
              { label: 'Estudiantes', icon: Users, onSelect: () => ir('/admin-master/clients/students') },
              { label: 'Arrendadores', icon: Users, onSelect: () => ir('/admin-master/clients/providers') },
              { label: 'Propiedades por revisar', icon: Building2, onSelect: () => ir('/admin-master/properties/to-review') },
              { label: 'Denuncias', icon: FileWarning, onSelect: () => ir('/admin-master/reports/listings') },
            ]
          : [];

  const utilidades: Accion[] = [
    {
      label: preference === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
      icon: preference === 'dark' ? Sun : Moon,
      onSelect: () => {
        setOpen(false);
        setPreference(preference === 'dark' ? 'light' : 'dark');
      },
    },
    ...(estaAutenticado
      ? [{ label: 'Contactar soporte', icon: Mail, onSelect: () => { setOpen(false); window.location.href = 'mailto:soporte@alquilaya.pe'; } }]
      : []),
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Busca una página o acción…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        <CommandGroup heading="Navegación">
          {navegacion.map((a) => (
            <CommandItem key={a.label} onSelect={a.onSelect}>
              <a.icon aria-hidden />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {sesion.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={estaAutenticado ? 'Tu cuenta' : 'Cuenta'}>
              {sesion.map((a) => (
                <CommandItem key={a.label} onSelect={a.onSelect}>
                  <a.icon aria-hidden />
                  {a.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Preferencias">
          {utilidades.map((a) => (
            <CommandItem key={a.label} onSelect={a.onSelect}>
              <a.icon aria-hidden />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      <div className="flex items-center gap-4 border-t border-border/60 bg-muted/30 px-4 py-2.5 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> Navegar
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> Seleccionar
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Kbd>Esc</Kbd> Cerrar
        </span>
      </div>
    </CommandDialog>
  );
}
