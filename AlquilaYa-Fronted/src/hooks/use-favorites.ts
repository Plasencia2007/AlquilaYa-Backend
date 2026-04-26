'use client';

import { useCallback, useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { favoriteService } from '@/services/favorite-service';
import { notify } from '@/lib/notify';

/**
 * Orquesta el ciclo de vida de favoritos:
 *  - Hidrata el store al loguearse.
 *  - Vacía el store al cerrar sesión.
 *  - Expone `toggle(id)` con UI optimista + revert si la API falla.
 *  - Si el usuario no está logueado, abre el AuthModal en lugar de fallar.
 */
export function useFavorites() {
  const { estaAutenticado, cargando: cargandoAuth } = useAuth();
  const { open: abrirAuthModal } = useAuthModal();
  const { ids, cargada, setIds, toggleLocal, esFavorito, reset } = useFavoritesStore();

  useEffect(() => {
    if (cargandoAuth) return;

    if (!estaAutenticado) {
      if (cargada) reset();
      return;
    }

    if (cargada) return;

    let cancelado = false;
    favoriteService
      .listar()
      .then((favoritos) => {
        if (cancelado) return;
        setIds(favoritos.map((p) => p.id));
      })
      .catch(() => {
        if (cancelado) return;
        setIds([]);
      });

    return () => {
      cancelado = true;
    };
  }, [estaAutenticado, cargandoAuth, cargada, setIds, reset]);

  const toggle = useCallback(
    async (id: string) => {
      if (!estaAutenticado) {
        abrirAuthModal('login');
        return;
      }

      toggleLocal(id);

      try {
        const ahoraEsFavorito = await favoriteService.toggle(id);
        const estadoLocal = useFavoritesStore.getState().esFavorito(id);
        if (estadoLocal !== ahoraEsFavorito) {
          toggleLocal(id);
        }
        notify.success(ahoraEsFavorito ? 'Agregado a favoritos' : 'Eliminado de favoritos');
      } catch (err) {
        toggleLocal(id);
        notify.error(err, 'No se pudo actualizar tu favorito');
      }
    },
    [estaAutenticado, abrirAuthModal, toggleLocal],
  );

  return { ids, esFavorito, toggle, cargada };
}
