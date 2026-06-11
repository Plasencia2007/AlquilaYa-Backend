'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';

/**
 * La pantalla real de favoritos vive en /student/favorites.
 * Esta ruta pública solo redirige según sesión/rol, o invita a loguearse.
 */
export default function FavoritesPage() {
  const router = useRouter();
  const { usuario, estaAutenticado, cargando } = useAuth();
  const { open: abrirAuthModal } = useAuthModal();

  useEffect(() => {
    if (cargando || !estaAutenticado) return;
    if (usuario?.rol === 'ESTUDIANTE') {
      router.replace('/student/favorites');
    } else if (usuario?.rol === 'ARRENDADOR') {
      router.replace('/landlord/dashboard');
    } else if (usuario?.rol === 'ADMIN') {
      router.replace('/admin-master');
    } else {
      router.replace('/');
    }
  }, [cargando, estaAutenticado, usuario, router]);

  if (cargando || estaAutenticado) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 pb-24 pt-24 sm:px-12 md:pt-28">
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
    </main>
  );
}
