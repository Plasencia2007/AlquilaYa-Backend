'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Máximo de propiedades comparables a la vez. */
export const MAX_COMPARE = 4;

/**
 * Store de comparación de propiedades. Persiste IDs en `sessionStorage`:
 * la comparación es efímera por pestaña, no debe sobrevivir al cierre del
 * navegador como sí hace `hidden-properties-store`.
 */
interface CompareState {
  selectedIds: string[];
  /**
   * Alterna la selección de una propiedad.
   * @returns `true` si se agregó, `false` si se removió o si fue rechazada
   *          por haber alcanzado el máximo (`MAX_COMPARE`).
   */
  toggle: (id: string) => boolean;
  clear: () => void;
  canAdd: () => boolean;
  has: (id: string) => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      selectedIds: [],

      toggle: (id) => {
        const { selectedIds } = get();
        if (selectedIds.includes(id)) {
          set({ selectedIds: selectedIds.filter((s) => s !== id) });
          return false;
        }
        if (selectedIds.length >= MAX_COMPARE) {
          return false;
        }
        set({ selectedIds: [...selectedIds, id] });
        return true;
      },

      clear: () => set({ selectedIds: [] }),

      canAdd: () => get().selectedIds.length < MAX_COMPARE,

      has: (id) => get().selectedIds.includes(id),
    }),
    {
      name: 'alquilaya-compare',
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);
