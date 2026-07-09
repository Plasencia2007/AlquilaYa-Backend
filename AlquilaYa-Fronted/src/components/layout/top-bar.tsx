'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { cn } from '@/lib/cn';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { useCommandPaletteStore } from '@/stores/command-palette-store';

import { Logo } from './logo';
import { Wordmark } from './wordmark';
import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/search', label: 'Explorar' },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
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
          className="flex items-center gap-2.5 transition-transform active:scale-95"
        >
          <Logo className={cn("h-7 w-7 transition-colors", isTransparent ? "text-white" : "text-primary")} />
          <Wordmark variant={isTransparent ? 'onDark' : 'themed'} />
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
        <button
          type="button"
          onClick={() => useCommandPaletteStore.getState().setOpen(true)}
          aria-label="Abrir búsqueda rápida"
          className={cn(
            "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:flex",
            isTransparent
              ? "border-white/30 text-white/80 hover:bg-white/10"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          <Search className="size-3.5" aria-hidden />
          Buscar
          <kbd className="ml-1 rounded border border-current/30 px-1 font-mono text-[10px] opacity-70">
            ⌘K
          </kbd>
        </button>

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
              onClick={() => router.push('/register')}

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
