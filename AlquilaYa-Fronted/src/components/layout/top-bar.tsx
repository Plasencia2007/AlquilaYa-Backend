'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { cn } from '@/lib/cn';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';

import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/search', label: 'Explorar' },
  { href: '#', label: 'Garantía' },
];

export function TopBar() {
  const pathname = usePathname();
  const { usuario, estaAutenticado, cargando } = useAuth();
  const { open: openAuthModal } = useAuthModal();

  return (
    <nav className="editorial-shadow fixed top-0 z-50 flex w-full items-center justify-between border-b border-primary/10 bg-background/80 px-6 py-3.5 backdrop-blur-xl transition-all duration-300 sm:px-12">
      <div className="flex items-center gap-12">
        <Link
          href="/"
          className="flex items-center gap-2 transition-transform active:scale-95"
        >
          <span className="text-xl font-black tracking-tighter text-primary">
            Alquila<span className="text-secondary">Ya</span>
          </span>
        </Link>

        <div className="ml-4 hidden items-center gap-12 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "font-headline text-xs font-black uppercase tracking-[0.2em] transition-colors",
                  active ? 'text-primary' : 'text-foreground hover:text-primary',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle />

        {cargando ? (
          <Skeleton className="h-8 w-24 rounded-full" />
        ) : estaAutenticado && usuario ? (
          <UserMenu />
        ) : (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => openAuthModal('register', 'ARRENDADOR')}
              className="hidden text-xs font-black uppercase tracking-[0.2em] text-foreground transition-colors hover:text-primary sm:inline-block"
            >
              Publicar
            </button>

            <Button
              size="sm"
              className="hidden h-9 px-5 text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 md:inline-flex"
              onClick={() => openAuthModal('login')}
            >
              Ingresar
            </Button>
          </div>
        )}

        <MobileNav />
      </div>
    </nav>
  );
}
