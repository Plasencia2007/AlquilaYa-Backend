import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BusquedaReciente {
  /** Texto de zona / distrito / nombre que el estudiante tecleó en "¿Dónde estudias?". */
  texto: string;
  /** epoch ms de la última vez que se usó (para ordenar por recencia). */
  buscadoEn: number;
}

const MAX_RECIENTES = 5;

interface RecentSearchesState {
  recientes: BusquedaReciente[];
  /** Registra una búsqueda de texto; la más reciente sube al tope, sin duplicados. */
  registrar: (texto: string) => void;
  eliminar: (texto: string) => void;
  limpiar: () => void;
}

/**
 * Últimas búsquedas de texto ("¿Dónde estudias?"), persistidas en localStorage.
 * Solo guarda el texto libre — se re-aplica vía `onSelectTexto` en `WhereSearch`.
 * `skipHydration` evita el mismatch SSR/CSR: el consumidor llama a
 * `useRecentSearchesStore.persist.rehydrate()` al montar.
 */
export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      recientes: [],

      registrar: (texto) =>
        set((state) => {
          const t = texto.trim();
          if (!t) return state;
          // Dedup case-insensitive: si ya existía, se elimina y vuelve a entrar al tope.
          const sinDup = state.recientes.filter(
            (r) => r.texto.toLowerCase() !== t.toLowerCase(),
          );
          return {
            recientes: [{ texto: t, buscadoEn: Date.now() }, ...sinDup].slice(0, MAX_RECIENTES),
          };
        }),

      eliminar: (texto) =>
        set((state) => ({
          recientes: state.recientes.filter(
            (r) => r.texto.toLowerCase() !== texto.trim().toLowerCase(),
          ),
        })),

      limpiar: () => set({ recientes: [] }),
    }),
    {
      name: 'alquilaya-busquedas-recientes',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
