import { create } from 'zustand';

interface FavoritesState {
  ids: Set<string>;
  cargada: boolean;

  setIds: (ids: Iterable<string>) => void;
  toggleLocal: (id: string) => void;
  esFavorito: (id: string) => boolean;
  reset: () => void;
}

/**
 * Store local de favoritos del estudiante. Solo IDs en memoria — la fuente
 * de verdad sigue siendo el backend; este store es la cache UI.
 *
 * Se hidrata al login (`useFavorites().cargar()`) y se vacía al logout.
 */
export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set<string>(),
  cargada: false,

  setIds: (ids) => set({ ids: new Set(ids), cargada: true }),

  toggleLocal: (id) =>
    set((state) => {
      const next = new Set(state.ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ids: next };
    }),

  esFavorito: (id) => get().ids.has(id),

  reset: () => set({ ids: new Set(), cargada: false }),
}));
