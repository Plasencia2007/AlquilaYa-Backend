'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Propiedad } from '@/types/propiedad';

import { PropertyCard } from './property-card';

interface Props {
  propiedades: Propiedad[];
  className?: string;
}

/**
 * Carrusel de cuartos destacados con CSS scroll-snap nativo.
 * - Mobile: 1 card visible (85vw) con peek de la siguiente.
 * - Tablet: 2 cards (60vw).
 * - Desktop: 3 cards (380px) + flechas prev/next.
 */
export function PropertyCarousel({ propiedades, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [puedeAvanzar, setPuedeAvanzar] = useState(false);
  const [puedeRetroceder, setPuedeRetroceder] = useState(false);

  const sincronizar = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setPuedeRetroceder(el.scrollLeft > 4);
    setPuedeAvanzar(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sincronizar();
    el.addEventListener('scroll', sincronizar, { passive: true });
    window.addEventListener('resize', sincronizar);
    return () => {
      el.removeEventListener('scroll', sincronizar);
      window.removeEventListener('resize', sincronizar);
    };
  }, [sincronizar, propiedades.length]);

  const desplazar = (direccion: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 380;
    el.scrollBy({ left: direccion * (cardWidth + 16), behavior: 'smooth' });
  };

  if (propiedades.length === 0) return null;

  return (
    <div className={cn('relative', className)}>
      <div
        ref={trackRef}
        className={cn(
          'flex snap-x snap-mandatory overflow-x-auto gap-4 -mx-6 px-6 pb-4 sm:-mx-12 sm:px-12',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {propiedades.map((p) => (
          <div
            key={p.id}
            className="snap-start shrink-0 w-[85vw] sm:w-[60vw] md:w-[380px]"
          >
            <PropertyCard propiedad={p} variant="compact" showFavorite showDistance />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 -left-2 hidden items-center md:flex">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => desplazar(-1)}
          disabled={!puedeRetroceder}
          aria-label="Anterior"
          className={cn(
            'pointer-events-auto size-11 rounded-full border-border bg-card shadow-lg transition-opacity',
            !puedeRetroceder && 'opacity-0',
          )}
        >
          <ChevronLeft className="size-5" />
        </Button>
      </div>

      <div className="pointer-events-none absolute inset-y-0 -right-2 hidden items-center md:flex">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => desplazar(1)}
          disabled={!puedeAvanzar}
          aria-label="Siguiente"
          className={cn(
            'pointer-events-auto size-11 rounded-full border-border bg-card shadow-lg transition-opacity',
            !puedeAvanzar && 'opacity-0',
          )}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
