'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';
import { useUnreadMessagesStore } from '@/stores/unread-messages-store';

interface Tab {
  href: string;
  label: string;
  icon: string;
  /** Prefijo de ruta para marcar el tab activo (ej. "/landlord/properties" cubre todas sus subrutas). */
  activePrefix: string;
}

// Ítem 349: 4 accesos (no los 7 de `student-bottom-nav.tsx` — el arrendador solo pide
// Dashboard/Propiedades/Mensajes/Reservas). Los íconos son `material-symbols-outlined`, no
// lucide-react: el resto del panel arrendador (sidebar incluida) usa esa fuente de íconos, no la
// que usa el panel estudiante.
const TABS: Tab[] = [
  { href: '/landlord/dashboard', label: 'Resumen', icon: 'grid_view', activePrefix: '/landlord/dashboard' },
  { href: '/landlord/properties/active', label: 'Cuartos', icon: 'home', activePrefix: '/landlord/properties' },
  { href: '/landlord/messages/students', label: 'Mensajes', icon: 'chat', activePrefix: '/landlord/messages' },
  { href: '/landlord/reservations/active', label: 'Reservas', icon: 'calendar_month', activePrefix: '/landlord/reservations' },
];

/**
 * Ítem 349: equivalente arrendador de `student-bottom-nav.tsx` — no existía antes (el drawer
 * mobile de `landlord-sidebar.tsx` cubre la navegación completa, pero requiere un tap extra para
 * abrirlo; este nav da acceso directo a las 4 secciones más usadas sin abrir el drawer).
 * Visible solo bajo el breakpoint `lg` (mismo breakpoint que el drawer/sidebar de escritorio).
 */
export function LandlordBottomNav() {
  const pathname = usePathname() ?? '';
  const mensajesNoLeidos = useUnreadMessagesStore((s) => s.total);

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-sidebar-border bg-sidebar/95 backdrop-blur lg:hidden"
    >
      {TABS.map((tab) => {
        const activo = pathname.startsWith(tab.activePrefix);
        const badgeCount = tab.href === '/landlord/messages/students' ? mensajesNoLeidos : 0;
        const badgeAriaLabel =
          badgeCount > 0 ? `${tab.label}, ${badgeCount} mensajes sin leer` : undefined;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            replace
            aria-label={badgeAriaLabel}
            aria-current={activo ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors',
              activo ? 'text-primary' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground',
            )}
          >
            <span className="relative flex">
              <span className="material-symbols-outlined text-[22px]" aria-hidden>
                {tab.icon}
              </span>
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
