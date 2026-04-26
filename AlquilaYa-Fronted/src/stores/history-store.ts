import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface HistorialEntry {
  propiedadId: string;
  visitadoEn: number; // epoch ms
}

const MAX_ENTRIES = 50;

interface HistoryState {
  entradas: HistorialEntry[];
  registrar: (propiedadId: string) => void;
  limpiar: () => void;
}

/**
 * Historial de cuartos visitados, persistido en localStorage. Solo IDs y
 * timestamps — no copias completas (las propiedades pueden cambiar).
 */
export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entradas: [],

      registrar: (propiedadId) =>
        set((state) => {
          const sinDuplicado = state.entradas.filter((e) => e.propiedadId !== propiedadId);
          const nuevas = [{ propiedadId, visitadoEn: Date.now() }, ...sinDuplicado];
          return { entradas: nuevas.slice(0, MAX_ENTRIES) };
        }),

      limpiar: () => set({ entradas: [] }),
    }),
    {
      name: 'alquilaya-historial',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
