'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { PropertyCard } from '@/components/student/property-card';
import { SkeletonCardGrid } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyFavoritesIllustration } from '@/components/shared/illustrations';
import { favoriteService, type FavoritoItem } from '@/services/favorite-service';
import { notify } from '@/lib/notify';
import { tiempoRelativo } from '@/lib/relative-time';
import { useHiddenPropertiesStore } from '@/stores/hidden-properties-store';
import type { Propiedad } from '@/types/propiedad';

const PAGE_SIZE = 12;

/** Una propiedad archivada/rechazada ya no se puede alquilar aunque conserve su flag. */
function noDisponible(p: Propiedad): boolean {
  return !p.disponible || p.estado === 'ARCHIVADO' || p.estado === 'RECHAZADO';
}

export default function StudentFavoritesPage() {
  const [items, setItems] = useState<FavoritoItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [cargandoMas, setCargandoMas] = useState(false);

  const hiddenIds = useHiddenPropertiesStore((s) => s.hiddenIds);
  const [hidratado, setHidratado] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    useHiddenPropertiesStore.persist.rehydrate()?.then(() => setHidratado(true));
  }, []);

  const visibles = useMemo(() => {
    if (!hidratado || showHidden) return items;
    return items.filter((f) => !hiddenIds.includes(f.propiedad.id));
  }, [items, hiddenIds, showHidden, hidratado]);

  const hiddenCount = items.length - visibles.length;

  useEffect(() => {
    let cancelado = false;
    favoriteService
      .listarPagina(0, PAGE_SIZE)
      .then((pagina) => {
        if (cancelado) return;
        setItems(pagina.items);
        setHasNext(pagina.hasNext);
        setPage(0);
        setEstado('ok');
      })
      .catch((err) => {
        if (cancelado) return;
        notify.error(err, 'No pudimos cargar tus favoritos');
        setEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const cargarMas = useCallback(async () => {
    setCargandoMas(true);
    try {
      const pagina = await favoriteService.listarPagina(page + 1, PAGE_SIZE);
      setItems((prev) => [...prev, ...pagina.items]);
      setHasNext(pagina.hasNext);
      setPage((p) => p + 1);
    } catch (err) {
      notify.error(err, 'No pudimos cargar más favoritos');
    } finally {
      setCargandoMas(false);
    }
  }, [page]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-h1">
          Mis favoritos
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Los cuartos que guardaste para revisar después.
        </p>
      </header>

      {estado === 'cargando' && <SkeletonCardGrid count={6} />}

      {estado === 'error' && (
        <ErrorState
          title="No pudimos cargar tus favoritos"
          description="Inténtalo de nuevo en un momento."
          retryLabel="Reintentar"
          onRetry={() => window.location.reload()}
        />
      )}

      {estado === 'ok' && items.length === 0 && (
        <EmptyState
          illustration={EmptyFavoritesIllustration}
          title="Aún no tienes favoritos"
          description="Explora cuartos y guárdalos con el corazón para verlos aquí."
          action={{ type: 'link', label: 'Explorar cuartos', href: '/search' }}
        />
      )}

      {estado === 'ok' && items.length > 0 && (
        <>
          <div className="card-grid">
            {visibles.map(({ propiedad, guardadoEn }) => {
              const inactiva = noDisponible(propiedad);
              return (
                <div key={propiedad.id} className={inactiva ? 'opacity-70' : undefined}>
                  <PropertyCard
                    propiedad={inactiva ? { ...propiedad, disponible: false } : propiedad}
                    variant="full"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Guardado {tiempoRelativo(guardadoEn)}
                  </p>
                </div>
              );
            })}
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

          {hasNext && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={cargarMas}
                disabled={cargandoMas}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                {cargandoMas && <Loader2 className="h-4 w-4 animate-spin" />}
                {cargandoMas ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
