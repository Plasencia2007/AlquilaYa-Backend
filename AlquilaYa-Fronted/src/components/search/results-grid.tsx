'use client';

import { useRef } from 'react';

import { PropertyCard } from '@/components/student/property-card';
import { SkeletonCard } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { cn } from '@/lib/cn';
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
}

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
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useInfiniteScroll(sentinelRef, onCargarMas, {
    enabled: hasMore && !cargando && !cargandoMas && !error,
  });

  if (cargando && items.length === 0) {
    return (
      <div className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <PropertyCard key={p.id} propiedad={p} variant="full" />
        ))}
        {cargandoMas &&
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`load-${i}`} />)}
      </div>

      {hasMore && <div ref={sentinelRef} className="h-10" aria-hidden />}

      {!hasMore && items.length > 0 && (
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
