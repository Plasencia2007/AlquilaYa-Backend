import { useFavoritesStore } from './favorites-store';
import { useNotificationsStore } from './notifications-store';
import { useUnreadMessagesStore } from './unread-messages-store';
import { useReservationsStore } from './reservations-store';
import { useCompareStore } from './compare-store';
import { useHistoryStore } from './history-store';
import { useHiddenPropertiesStore } from './hidden-properties-store';
import { useRecentSearchesStore } from './recent-searches-store';
import { useSavedSearchesStore } from './saved-searches-store';
import { useSearchPreferencesStore } from './search-preferences-store';
import { useFavoriteCollectionsStore } from './favorite-collections-store';

/**
 * Limpia todos los stores que puedan conservar datos del usuario que cierra sesión
 * (ítem 187): favoritos, notificaciones, mensajes no leídos, reservas cacheadas,
 * comparador, historial de vistas, avisos ocultos, búsquedas recientes/guardadas,
 * preferencias de búsqueda y colecciones/notas de favoritos. Se llama desde
 * `useAuthStore.cerrarSesion()` — así, si otra persona inicia sesión en el mismo
 * dispositivo justo después, no hereda nada del usuario anterior.
 */
export function resetAllStores(): void {
  useFavoritesStore.getState().reset();
  useNotificationsStore.getState().reset();
  useUnreadMessagesStore.getState().reset();
  useReservationsStore.getState().reset();
  useCompareStore.getState().clear();
  useHistoryStore.getState().limpiar();
  useHiddenPropertiesStore.getState().clear();
  useRecentSearchesStore.getState().limpiar();
  useSavedSearchesStore.getState().limpiarTodas();
  useSearchPreferencesStore.getState().limpiarPreferencias();
  useFavoriteCollectionsStore.getState().reset();
}
