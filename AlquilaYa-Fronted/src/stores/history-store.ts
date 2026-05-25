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
  /** `true` si la propiedad fue visitada (existe en `entradas`). */
  isViewed: (propiedadId: string) => boolean;
}

/**
 * Historial de cuartos visitados, persistido en localStorage. Solo IDs y
 * timestamps — no copias completas (las propiedades pueden cambiar).
 */
export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entradas: [],

      registrar: (propiedadId) =>
        set((state) => {
          const sinDuplicado = state.entradas.filter((e) => e.propiedadId !== propiedadId);
          const nuevas = [{ propiedadId, visitadoEn: Date.now() }, ...sinDuplicado];
          return { entradas: nuevas.slice(0, MAX_ENTRIES) };
        }),

      limpiar: () => set({ entradas: [] }),

      isViewed: (propiedadId) => get().entradas.some((e) => e.propiedadId === propiedadId),
    }),
    {
      name: 'alquilaya-historial',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/**
 * Alias en español del store de historial, usado por el rediseño de la
 * cartilla de propiedad (badge "Ya la viste"). Exporta exactamente la misma
 * instancia que `useHistoryStore` — NO duplicar estado.
 */
export const useHistorialStore = useHistoryStore;
