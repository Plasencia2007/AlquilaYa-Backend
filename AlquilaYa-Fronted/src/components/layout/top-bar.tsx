'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { cn } from '@/lib/cn';
import { useCommandPaletteStore } from '@/stores/command-palette-store';

import { MobileNav } from './mobile-nav';
import { NavbarBrand } from './navbar-brand';
import { NavbarAuthActions } from './navbar-auth-actions';

// Rutas con hero oscuro a pantalla completa: sólo ahí tiene sentido la navbar
// transparente (texto blanco). En el resto (fondo claro) sería ilegible, así que
// arranca y se queda sólida.
const HERO_ROUTES = ['/', '/arrendadores'];

export function TopBar() {
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);
  const isHeroRoute = HERO_ROUTES.includes(pathname);

  useEffect(() => {
    // Fuera del hero la navbar es siempre sólida: `isTransparent` ya lo garantiza
    // con `isHeroRoute`, así que no hace falta observer ni tocar el estado aquí.
    if (!isHeroRoute) return;

    // Sentinel al inicio del documento: mientras es visible estamos sobre el hero;
    // cuando el scroll lo saca del viewport, la navbar pasa a sólida. Más eficiente
    // que escuchar cada evento `scroll`. Se inyecta en el body porque el TopBar es
    // `fixed` (fuera del flujo), así que no puede llevar el sentinel como hijo. El
    // observer emite un callback inicial al observar, fijando el estado correcto.
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText =
      'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none;';
    document.body.appendChild(sentinel);

    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, [isHeroRoute]);

  const isTransparent = isHeroRoute && !isScrolled;

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 flex w-full items-center justify-between transition-all duration-300 sm:px-12",
        isTransparent
          ? "bg-transparent py-6 border-transparent"
          : "glass-nav editorial-shadow border-b border-primary/10 bg-background/80 px-6 py-3.5"
      )}
    >
      <NavbarBrand transparent={isTransparent} />

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

        <NavbarAuthActions transparent={isTransparent} />

        <MobileNav />
      </div>
    </nav>
  );
}
