'use client';

import { useEffect, useState } from 'react';
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
];

export function TopBar() {
  const pathname = usePathname();
  const { usuario, estaAutenticado, cargando } = useAuth();
  const { open: openAuthModal } = useAuthModal();

  const [isScrolled, setIsScrolled] = useState(false);
  const isHome = pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isTransparent = isHome && !isScrolled;

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 flex w-full items-center justify-between transition-all duration-300 sm:px-12",
        isTransparent
          ? "bg-transparent py-6 border-transparent"
          : "editorial-shadow border-b border-primary/10 bg-background/80 px-6 py-3.5 backdrop-blur-xl"
      )}
    >
      <div className="flex items-center gap-12">
        <Link
          href="/"
          className="flex items-center gap-2 transition-transform active:scale-95"
        >
          <span className={cn("text-xl font-black tracking-tighter", isTransparent ? "text-white" : "text-primary")}>
            AlquilaYa
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
                  active
                    ? (isTransparent ? 'text-white' : 'text-primary')
                    : (isTransparent ? 'text-white/80 hover:text-white' : 'text-foreground hover:text-primary'),
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle
          className={cn(isTransparent && "text-white hover:bg-white/20 hover:text-white")}
        />

        {cargando ? (
          <Skeleton className="h-8 w-24 rounded-full" />
        ) : estaAutenticado && usuario ? (
          <UserMenu />
        ) : (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => openAuthModal('register', 'ARRENDADOR')}
              className={cn(
                "hidden text-xs font-black uppercase tracking-[0.2em] transition-colors sm:inline-block",
                isTransparent ? "text-white hover:text-white/80" : "text-foreground hover:text-primary"
              )}
            >
              Registrarse
            </button>

            <Button
              size="sm"
              className={cn(
                "hidden h-9 px-5 text-xs font-black uppercase tracking-[0.2em] shadow-lg md:inline-flex",
                isTransparent
                  ? "bg-white text-primary hover:bg-white/90"
                  : "shadow-primary/20"
              )}
              onClick={() => openAuthModal('login')}
            >
              Iniciar Sesión
            </Button>
          </div>
        )}

        <MobileNav />
      </div>
    </nav>
  );
}
