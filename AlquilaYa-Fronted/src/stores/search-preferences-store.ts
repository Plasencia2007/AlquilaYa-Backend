import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Preferencias de búsqueda del estudiante (ítem 137).
 *
 * Cuando repite ~3 búsquedas con el MISMO rango de filtros ofrecemos guardarlo como
 * su preferencia por defecto y, si acepta, la aplicamos en futuras visitas a /search
 * que lleguen SIN filtros en la URL.
 *
 * - `firmasRecientes`: historial acotado de firmas de rango (ver `firmaFiltros`) para
 *   detectar la repetición. Persistido para que la detección cruce visitas.
 * - `preferencias`: query string canónica (sin '?') de los filtros guardados.
 * - `ofertaDescartada`: si el usuario descartó la oferta, no volvemos a insistir.
 *
 * `skipHydration` evita el mismatch SSR/CSR; el consumidor rehidrata al montar.
 */

const UMBRAL_REPETICION = 3;
const MAX_FIRMAS = 12;

interface FirmaEntry {
  firma: string;
  en: number; // epoch ms
}

interface SearchPreferencesState {
  firmasRecientes: FirmaEntry[];
  /** Query canónica de filtros guardada como preferencia por defecto, o null. */
  preferencias: string | null;
  ofertaDescartada: boolean;

  /** Registra la firma de una búsqueda ejecutada (ignora firmas vacías). */
  registrarBusqueda: (firma: string) => void;
  /** Cuántas de las firmas recientes coinciden con `firma`. */
  conteoFirma: (firma: string) => number;
  /** Guarda la preferencia (query canónica) y limpia el registro/descartado. */
  guardarPreferencias: (query: string) => void;
  /** El usuario descartó la oferta: no volver a ofrecer. */
  descartarOferta: () => void;
  limpiarPreferencias: () => void;
}

export const UMBRAL_REPETICION_PREFERENCIAS = UMBRAL_REPETICION;

export const useSearchPreferencesStore = create<SearchPreferencesState>()(
  persist(
    (set, get) => ({
      firmasRecientes: [],
      preferencias: null,
      ofertaDescartada: false,

      registrarBusqueda: (firma) => {
        const f = firma.trim();
        if (!f) return;
        set((state) => ({
          firmasRecientes: [{ firma: f, en: Date.now() }, ...state.firmasRecientes].slice(
            0,
            MAX_FIRMAS,
          ),
        }));
      },

      conteoFirma: (firma) => {
        const f = firma.trim();
        if (!f) return 0;
        return get().firmasRecientes.filter((r) => r.firma === f).length;
      },

      guardarPreferencias: (query) =>
        set({ preferencias: query, ofertaDescartada: false, firmasRecientes: [] }),

      descartarOferta: () => set({ ofertaDescartada: true }),

      limpiarPreferencias: () =>
        set({ preferencias: null, ofertaDescartada: false, firmasRecientes: [] }),
    }),
    {
      name: 'alquilaya-preferencias-busqueda',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
