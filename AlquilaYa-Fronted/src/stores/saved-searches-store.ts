import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BusquedaGuardada {
  id: string;
  /** Etiqueta legible derivada de los filtros (ej. "Ñaña · hasta S/500"). */
  etiqueta: string;
  /** Query string canónica (sin '?') producida por `serializarFiltros`; se re-ejecuta en /search. */
  query: string;
  /** epoch ms de creación. */
  creadaEn: number;
  /**
   * `true` si el estudiante ya solicitó la alerta por correo para esta búsqueda.
   * La baja server-side requiere el token que llega por email (double opt-in),
   * así que este flag es solo un recordatorio local de que la alerta ya se pidió.
   */
  alertaActiva?: boolean;
}

const MAX_GUARDADAS = 30;

function nuevoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface SavedSearchesState {
  busquedas: BusquedaGuardada[];
  /** Guarda una búsqueda; devuelve `duplicada:true` si ya existía una con la misma query. */
  guardar: (input: { etiqueta: string; query: string }) => { duplicada: boolean };
  eliminar: (id: string) => void;
  marcarAlerta: (id: string, activa: boolean) => void;
  limpiarTodas: () => void;
}

/**
 * Búsquedas guardadas por el estudiante (ítem 112). Persistidas en localStorage:
 * cada una es un conjunto de filtros serializado que se re-ejecuta desde el panel.
 * `skipHydration` evita el mismatch SSR/CSR; el consumidor rehidrata al montar.
 */
export const useSavedSearchesStore = create<SavedSearchesState>()(
  persist(
    (set, get) => ({
      busquedas: [],

      guardar: ({ etiqueta, query }) => {
        if (get().busquedas.some((b) => b.query === query)) return { duplicada: true };
        set((state) => ({
          busquedas: [
            { id: nuevoId(), etiqueta, query, creadaEn: Date.now() },
            ...state.busquedas,
          ].slice(0, MAX_GUARDADAS),
        }));
        return { duplicada: false };
      },

      eliminar: (id) =>
        set((state) => ({ busquedas: state.busquedas.filter((b) => b.id !== id) })),

      marcarAlerta: (id, activa) =>
        set((state) => ({
          busquedas: state.busquedas.map((b) =>
            b.id === id ? { ...b, alertaActiva: activa } : b,
          ),
        })),

      limpiarTodas: () => set({ busquedas: [] }),
    }),
    {
      name: 'alquilaya-busquedas-guardadas',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
