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
  // Ítem 433: selectores atómicos — `setIds`/`toggleLocal`/`reset` son referencias
  // estables (acciones del store), así que suscribirse a cada una por separado no
  // dispara re-render en los N componentes que usan este hook cuando cambia el
  // favorito de OTRA propiedad (antes `useFavoritesStore()` completo sí lo hacía,
  // porque cualquier `set()` crea un objeto de estado nuevo). El booleano puntual
  // de "es favorito ESTA propiedad" ya no vive aquí — lo lee `FavoriteButton`
  // directo del store con su propio selector granular por id.
  const cargada = useFavoritesStore((s) => s.cargada);
  const setIds = useFavoritesStore((s) => s.setIds);
  const toggleLocal = useFavoritesStore((s) => s.toggleLocal);
  const reset = useFavoritesStore((s) => s.reset);

  useEffect(() => {
    if (cargandoAuth) return;

    if (!estaAutenticado) {
      if (cargada) reset();
      return;
    }

    if (cargada) return;

    let cancelado = false;
    favoriteService
      .listarIds()
      .then((ids) => {
        if (cancelado) return;
        setIds(ids);
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

  return { toggle, cargada };
}
