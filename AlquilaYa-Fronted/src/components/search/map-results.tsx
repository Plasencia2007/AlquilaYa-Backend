'use client';

import dynamic from 'next/dynamic';

import { MapSkeleton } from '@/components/search/map-skeleton';
import { MapFacade } from '@/components/shared/map-facade';
import { useInView } from '@/hooks/use-in-view';
import { cn } from '@/lib/cn';
import type { CentroBusqueda } from '@/hooks/use-properties-search';
import type { Propiedad } from '@/types/propiedad';

// Mapa de resultados EXCLUSIVO de /search (clusters, pastilla de precio, "buscar en
// esta área", hover sync). Se carga en cliente porque Leaflet rompe en SSR; mientras
// carga se muestra el skeleton (119) del mismo tamaño para evitar layout shift.
const SearchMap = dynamic(() => import('@/components/search/search-map'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

interface Props {
  propiedades: Propiedad[];
  className?: string;
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  /** Setter del núcleo de búsqueda para "buscar en esta área" (ítem 116). */
  setCentroBusqueda?: (c: CentroBusqueda | null) => void;
}

export function MapResults({ propiedades, className, activeId, onHover, setCentroBusqueda }: Props) {
  // Ítem 421: en mobile este panel vive detrás de `hidden` (ver search-client.tsx) hasta
  // que el usuario cambia a la vista "mapa" — un elemento `display:none` nunca intersecta,
  // así que Leaflet tampoco se descarga en ese caso. En desktop (split view, siempre
  // visible) el observer dispara casi de inmediato al montar, igual que antes.
  const [ref, enVista, mostrarMapa] = useInView<HTMLDivElement>({ rootMargin: '200px' });

  return (
    <div
      ref={ref}
      className={cn(
        'h-full w-full overflow-hidden rounded-2xl border border-border shadow-sm',
        className,
      )}
    >
      {enVista ? (
        <SearchMap
          propiedades={propiedades}
          className="h-full w-full"
          activeId={activeId}
          onHover={onHover}
          setCentroBusqueda={setCentroBusqueda}
        />
      ) : (
        <MapFacade className="h-full" onActivate={mostrarMapa} />
      )}
    </div>
  );
}
