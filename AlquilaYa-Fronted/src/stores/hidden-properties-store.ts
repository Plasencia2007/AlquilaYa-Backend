'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Store de propiedades ocultas. Persiste IDs en `localStorage` para que
 * el filtrado sobreviva recargas y se aplique en grids y carruseles.
 *
 * Se usa un array (no Set) porque `Set` no se serializa de forma directa
 * en JSON; el persist de Zustand pierde la estructura al rehidratar.
 */
interface HiddenPropertiesState {
  hiddenIds: string[];
  hide: (id: string) => void;
  unhide: (id: string) => void;
  isHidden: (id: string) => boolean;
  clear: () => void;
}

export const useHiddenPropertiesStore = create<HiddenPropertiesState>()(
  persist(
    (set, get) => ({
      hiddenIds: [],

      hide: (id) =>
        set((state) => {
          if (state.hiddenIds.includes(id)) return state;
          return { hiddenIds: [...state.hiddenIds, id] };
        }),

      unhide: (id) =>
        set((state) => ({
          hiddenIds: state.hiddenIds.filter((h) => h !== id),
        })),

      isHidden: (id) => get().hiddenIds.includes(id),

      clear: () => set({ hiddenIds: [] }),
    }),
    {
      name: 'alquilaya-hidden-properties',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
