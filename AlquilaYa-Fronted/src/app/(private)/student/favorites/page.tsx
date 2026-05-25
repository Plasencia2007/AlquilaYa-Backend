'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';

import { PropertyCard } from '@/components/student/property-card';
import { SkeletonCardGrid } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { favoriteService } from '@/services/favorite-service';
import { notify } from '@/lib/notify';
import { useHiddenPropertiesStore } from '@/stores/hidden-properties-store';
import type { Propiedad } from '@/types/propiedad';

export default function StudentFavoritesPage() {
  const [favoritos, setFavoritos] = useState<Propiedad[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const hiddenIds = useHiddenPropertiesStore((s) => s.hiddenIds);
  const [hidratado, setHidratado] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    useHiddenPropertiesStore.persist.rehydrate()?.then(() => setHidratado(true));
  }, []);

  const visibles = useMemo(() => {
    if (!hidratado || showHidden) return favoritos;
    return favoritos.filter((p) => !hiddenIds.includes(p.id));
  }, [favoritos, hiddenIds, showHidden, hidratado]);

  const hiddenCount = favoritos.length - visibles.length;

  useEffect(() => {
    let cancelado = false;
    favoriteService
      .listar()
      .then((items) => {
        if (cancelado) return;
        setFavoritos(items);
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
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

      {estado === 'ok' && favoritos.length === 0 && (
        <EmptyState
          icon={Heart}
          title="Aún no tienes favoritos"
          description="Explora cuartos y guárdalos con el corazón para verlos aquí."
          action={{ type: 'link', label: 'Explorar cuartos', href: '/search' }}
        />
      )}

      {estado === 'ok' && favoritos.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((p) => (
              <PropertyCard key={p.id} propiedad={p} variant="full" />
            ))}
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
        </>
      )}
    </div>
  );
}
