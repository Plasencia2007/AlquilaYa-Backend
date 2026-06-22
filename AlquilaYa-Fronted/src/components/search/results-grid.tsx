'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { PropertyCard } from '@/components/student/property-card';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { cn } from '@/lib/cn';
import { useHiddenPropertiesStore } from '@/stores/hidden-properties-store';
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
}

const GRID_DEFAULT = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3';

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
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useInfiniteScroll(sentinelRef, onCargarMas, {
    enabled: hasMore && !cargando && !cargandoMas && !error,
  });

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
    return (
      <EmptyState
        title="Ningún cuarto coincide con tus filtros"
        description="Prueba ampliando el rango de precio o quitando algunos servicios."
        action={{ type: 'button', label: 'Limpiar filtros', onClick: onLimpiarFiltros }}
      />
    );
  }

  return (
    <div className={className}>
      <div className={gridClassName}>
        {visible.map((p) => (
          <div
            key={p.id}
            onMouseEnter={() => onHover?.(p.id)}
            onMouseLeave={() => onHover?.(null)}
            className={cn(
              'rounded-2xl transition-shadow',
              activeId === p.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
            )}
          >
            <PropertyCard propiedad={p} variant="full" />
          </div>
        ))}
        {cargandoMas &&
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`load-${i}`} />)}
      </div>

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
