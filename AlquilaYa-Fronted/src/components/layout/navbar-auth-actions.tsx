'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthModal } from '@/stores/auth-modal-store';
import { cn } from '@/lib/cn';

import { UserMenu } from './user-menu';

// Ruta del panel según rol (ítem 102). El estudiante no tiene "panel": su
// experiencia principal es el home/buscador, así que no muestra este CTA.
const PANEL_POR_ROL: Record<string, string> = {
  ARRENDADOR: '/landlord/dashboard',
  ADMIN: '/admin-master',
};

interface NavbarAuthActionsProps {
  /** Header sobre foto (hero de home sin scroll): botón "Iniciar sesión" en blanco. */
  transparent?: boolean;
  /**
   * El TopBar oculta "Iniciar sesión" en móvil porque el `MobileNav` (hamburguesa)
   * ya trae sus propios CTAs de login/registro. La navbar de /search no tiene
   * hamburguesa, así que ahí el botón debe verse también en móvil.
   */
  hideLoginOnMobile?: boolean;
}

export function NavbarAuthActions({ transparent = false, hideLoginOnMobile = true }: NavbarAuthActionsProps) {
  const router = useRouter();
  // Ítem 433: selectores atómicos en vez de `useAuth()` completo — este componente es de
  // altísimo tráfico (navbar pública) y solo lee estos 3 campos, nunca las acciones de
  // login/registro. `inicializar()` (efecto de useAuth) sigue disparándose igual: lo montan
  // siempre CommandPalette e ImpersonationBanner en el layout raíz.
  const usuario = useAuthStore((s) => s.usuario);
  const estaAutenticado = useAuthStore((s) => s.estaAutenticado);
  const cargando = useAuthStore((s) => s.cargando);
  const { open: openAuthModal } = useAuthModal();

  if (cargando) {
    return <Skeleton className="h-8 w-24 rounded-full" />;
  }

  if (estaAutenticado && usuario) {
    // ARRENDADOR/ADMIN navegando el sitio público: CTA directo a su panel
    // (ítem 102), en vez de dejarlos sólo con el menú de estudiante.
    const panelHref = PANEL_POR_ROL[usuario.rol];

    return (
      <div className="flex items-center gap-3">
        {panelHref && (
          <Button
            asChild
            size="sm"
            className={cn(
              'hidden h-9 gap-1.5 px-4 text-xs font-black uppercase tracking-[0.15em] shadow-lg sm:inline-flex',
              transparent ? 'bg-white text-primary hover:bg-white/90' : 'shadow-primary/20',
            )}
          >
            <Link href={panelHref}>
              <LayoutDashboard className="size-4" aria-hidden />
              Ir a mi panel
            </Link>
          </Button>
        )}
        <UserMenu />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => router.push('/register')}
        className={cn(
          'hidden text-xs font-black uppercase tracking-[0.2em] transition-colors sm:inline-block',
          transparent ? 'text-white hover:text-white/80' : 'text-foreground hover:text-primary',
        )}
      >
        Registrarse
      </button>

      <Button
        size="sm"
        className={cn(
          'h-9 px-5 text-xs font-black uppercase tracking-[0.2em] shadow-lg',
          hideLoginOnMobile && 'hidden md:inline-flex',
          transparent ? 'bg-white text-primary hover:bg-white/90' : 'shadow-primary/20',
        )}
        onClick={() => openAuthModal('login')}
      >
        Iniciar Sesión
      </Button>
    </div>
  );
}
