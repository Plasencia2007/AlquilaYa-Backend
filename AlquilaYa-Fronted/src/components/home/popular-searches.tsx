import Link from 'next/link';
import { Bed, Car, MapPin, Star, Wallet, Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { serializarFiltros } from '@/lib/search-url';
import type { Filtros } from '@/schemas/search-schema';
import { RevealOnScroll, Stagger } from '@/components/motion';
import { cn } from '@/lib/cn';

interface Chip {
  label: string;
  icon: LucideIcon;
  filtros: Partial<Filtros>;
}

/**
 * Cada chip mapea a filtros REALES del buscador (`schemas/search-schema.ts`) y
 * se serializa con `serializarFiltros` para que la URL sea idéntica a la que
 * produce el propio buscador.
 *
 * Los ejemplos "Amoblados" y "Solo mujeres" del brief NO tienen filtro que los
 * respalde (no existe servicio `AMOBLADO` en `SERVICIOS_CATALOGO` ni filtro de
 * género en el schema), así que se sustituyen por chips con soporte real.
 */
const CHIPS: Chip[] = [
  { label: 'Cerca de la UPeU', icon: MapPin, filtros: { distanciaMaxKm: 2 } },
  { label: 'Hasta S/ 500', icon: Wallet, filtros: { precioMax: 500 } },
  { label: 'Con Wi-Fi', icon: Wifi, filtros: { servicios: ['WIFI'] } },
  { label: 'Cuarto individual', icon: Bed, filtros: { tipo: 'CUARTO_INDIVIDUAL' } },
  { label: 'Mejor valorados', icon: Star, filtros: { calificacionMin: 4 } },
  { label: 'Con estacionamiento', icon: Car, filtros: { servicios: ['ESTACIONAMIENTO'] } },
];

function hrefFor(filtros: Partial<Filtros>): string {
  const qs = serializarFiltros(filtros);
  return qs ? `/search?${qs}` : '/search';
}

export function PopularSearches() {
  return (
    <section className="border-b border-border bg-background px-6 py-8 sm:px-12">
      <RevealOnScroll className="mx-auto max-w-6xl">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Búsquedas populares
        </p>
        <Stagger className="flex flex-wrap gap-2.5" staggerDelay={0.05}>
          {CHIPS.map(({ label, icon: Icon, filtros }) => (
            <Link
              key={label}
              href={hrefFor(filtros)}
              className={cn(
                'group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2',
                'text-sm font-semibold text-foreground shadow-sm transition-colors',
                'hover:border-primary hover:bg-primary/5 hover:text-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              )}
            >
              <Icon
                className="size-4 text-primary transition-transform group-hover:scale-110"
                aria-hidden
              />
              {label}
            </Link>
          ))}
        </Stagger>
      </RevealOnScroll>
    </section>
  );
}
