'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { PropertyCard } from '@/components/student/property-card';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptySearchIllustration } from '@/components/shared/illustrations';
import { Button } from '@/components/ui/button';
import { Stagger } from '@/components/motion';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { cn } from '@/lib/cn';
import { useHiddenPropertiesStore } from '@/stores/hidden-properties-store';
import type { SugerenciaRelajacion } from '@/lib/relax-filters';
import type { Filtros } from '@/schemas/search-schema';
import type { Propiedad } from '@/types/propiedad';

interface Props {
  items: Propiedad[];
  cargando: boolean;
  cargandoMas: boolean;
  hasMore: boolean;
  error: boolean;
  onCargarMas: () => void;
  onReintentar: () => void;
  onLimpiarFiltros: () => void;
  className?: string;
  /** Clases de la grilla (columnas/gap). Por defecto 3 columnas; en el split se pasa 2. */
  gridClassName?: string;
  /** id resaltado (hover desde el mapa) + callback de hover (para sincronizar con el mapa). */
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  /**
   * Sugerencia de relajación de filtros para el empty state inteligente (ítem 124),
   * pre-calculada por el hook. `onAplicarSugerencia` aplica su `patch` a los filtros.
   */
  sugerencia?: SugerenciaRelajacion | null;
  onAplicarSugerencia?: (patch: Partial<Filtros>) => void;
}

const GRID_DEFAULT = 'grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3';

export function ResultsGrid({
  items,
  cargando,
  cargandoMas,
  hasMore,
  error,
  onCargarMas,
  onReintentar,
  onLimpiarFiltros,
  className,
  gridClassName = GRID_DEFAULT,
  activeId,
  onHover,
  sugerencia,
  onAplicarSugerencia,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useInfiniteScroll(sentinelRef, onCargarMas, {
    enabled: hasMore && !cargando && !cargandoMas && !error,
  });

  // Sincronía marcador → card (ítem 117): cuando el hover viene del mapa, traemos la
  // card correspondiente a la vista. `block: 'nearest'` la deja quieta si ya se ve (p.ej.
  // cuando el hover se originó en la propia card), así que no "salta" al pasar el cursor
  // por la lista. Scroll es sincronización con el DOM, no setState — no infringe el lint.
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  useEffect(() => {
    if (!activeId) return;
    cardRefs.current.get(activeId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  // Hidratación + filtro de propiedades ocultas
  const hiddenIds = useHiddenPropertiesStore((s) => s.hiddenIds);
  const [hidratado, setHidratado] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    useHiddenPropertiesStore.persist.rehydrate()?.then(() => setHidratado(true));
  }, []);

  const visible = useMemo(() => {
    if (!hidratado || showHidden) return items;
    return items.filter((p) => !hiddenIds.includes(p.id));
  }, [items, hiddenIds, showHidden, hidratado]);

  const hiddenCount = items.length - visible.length;

  if (cargando && items.length === 0) {
    return (
      <div className={cn(gridClassName, className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <ErrorState
        title="No pudimos cargar los cuartos"
        description="Algo salió mal de nuestro lado. Inténtalo de nuevo."
        retryLabel="Reintentar"
        onRetry={onReintentar}
      />
    );
  }

  if (items.length === 0) {
    // Empty state inteligente (ítem 124): si el hook pre-calculó una relajación con
    // conteo real > 0, la ofrecemos con un click; si no, empty state normal.
    if (sugerencia) {
      return (
        <div className="flex flex-col items-center gap-4">
          <EmptyState
            illustration={EmptySearchIllustration}
            title="Ningún cuarto coincide con tus filtros"
            description={sugerencia.mensaje}
            action={{
              type: 'button',
              label: 'Aplicar sugerencia',
              onClick: () => onAplicarSugerencia?.(sugerencia.patch),
            }}
          />
          <button
            type="button"
            onClick={onLimpiarFiltros}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            O limpiar todos los filtros
          </button>
        </div>
      );
    }

    return (
      <EmptyState
        illustration={EmptySearchIllustration}
        title="Ningún cuarto coincide con tus filtros"
        description="Prueba ampliando el rango de precio o quitando algunos servicios."
        action={{ type: 'button', label: 'Limpiar filtros', onClick: onLimpiarFiltros }}
      />
    );
  }

  return (
    <div className={className}>
      <Stagger className={gridClassName} staggerDelay={0.05}>
        {visible.map((p) => (
          <div
            key={p.id}
            ref={(el) => {
              if (el) cardRefs.current.set(p.id, el);
              else cardRefs.current.delete(p.id);
            }}
            onMouseEnter={() => onHover?.(p.id)}
            onMouseLeave={() => onHover?.(null)}
            className={cn(
              'flex h-full flex-col rounded-2xl transition-shadow',
              // Resaltado cuando el marcador del mapa correspondiente está en hover (ítem 117).
              activeId === p.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
            )}
          >
            <PropertyCard propiedad={p} variant="full" />
          </div>
        ))}
        {cargandoMas &&
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`load-${i}`} />)}
      </Stagger>

      {hiddenCount > 0 && !showHidden && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setShowHidden(true)}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Mostrar {hiddenCount} oculta{hiddenCount === 1 ? '' : 's'}
          </button>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="h-10" aria-hidden />}

      {!hasMore && visible.length > 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Estos son todos los cuartos que coinciden contigo.
        </p>
      )}

      {error && items.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={onReintentar}>
            Reintentar carga
          </Button>
        </div>
      )}
    </div>
  );
}
