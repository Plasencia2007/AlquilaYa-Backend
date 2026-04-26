'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

import { PropertyCard } from '@/components/student/property-card';
import { SkeletonCardGrid } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { favoriteService } from '@/services/favorite-service';
import { notify } from '@/lib/notify';
import type { Propiedad } from '@/types/propiedad';

export default function FavoritesPage() {
  const { estaAutenticado, cargando: cargandoAuth } = useAuth();
  const { open: abrirAuthModal } = useAuthModal();

  const [favoritos, setFavoritos] = useState<Propiedad[]>([]);
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'ok' | 'error'>('idle');

  useEffect(() => {
    if (cargandoAuth) return;
    if (!estaAutenticado) {
      setEstado('idle');
      return;
    }

    let cancelado = false;
    setEstado('cargando');
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
  }, [estaAutenticado, cargandoAuth]);

  return (
    <main className="mx-auto max-w-7xl px-6 pb-24 pt-24 sm:px-12 md:pt-28">
      <header className="mb-8 space-y-2">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Mis favoritos
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Los cuartos que guardaste para revisar después.
        </p>
      </header>

      {!cargandoAuth && !estaAutenticado && (
        <EmptyState
          icon={Heart}
          title="Inicia sesión para ver tus favoritos"
          description="Guarda los cuartos que te gusten y vuelve a ellos cuando quieras."
          action={{
            type: 'button',
            label: 'Iniciar sesión',
            onClick: () => abrirAuthModal('login'),
          }}
        />
      )}

      {(cargandoAuth || estado === 'cargando') && estaAutenticado && (
        <SkeletonCardGrid count={6} />
      )}

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
          description="Explora cuartos y dale al corazón a los que te gusten."
          action={{ type: 'link', label: 'Explorar cuartos', href: '/search' }}
        />
      )}

      {estado === 'ok' && favoritos.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favoritos.map((p) => (
            <PropertyCard key={p.id} propiedad={p} variant="full" />
          ))}
        </div>
      )}
    </main>
  );
}
