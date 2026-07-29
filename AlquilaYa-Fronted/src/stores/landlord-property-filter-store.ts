'use client';

import { create } from 'zustand';

/** Sentinel para "todas las propiedades" — mismo valor que ya usaban los selects locales de
 *  `finances/monthly` y `finances/per-room` antes del ítem 344 (se preserva para no romper URLs
 *  ni comparaciones existentes). */
export const TODAS_LAS_PROPIEDADES = '__todas__';

export interface PropiedadFiltroOpcion {
  id: string;
  titulo: string;
}

interface LandlordPropertyFilterState {
  /** `TODAS_LAS_PROPIEDADES` o el id (string) de la propiedad seleccionada. */
  propiedadId: string;
  propiedades: PropiedadFiltroOpcion[];
  cargando: boolean;
  /** `perfilId` del arrendador para el que ya se cargó `propiedades` — evita refetch al navegar
   *  entre páginas que montan el switcher (finances/monthly ↔ finances/per-room). */
  cargadoPara: string | null;
  setPropiedadId: (id: string) => void;
  setPropiedades: (perfilId: string, propiedades: PropiedadFiltroOpcion[]) => void;
  setCargando: (v: boolean) => void;
}

/**
 * Ítem 344: mecanismo central del "workspace switcher" de propiedad del panel arrendador.
 * Zustand singleton (sobrevive a la navegación cliente entre páginas de `landlord/`, a
 * diferencia de un `useState` local) — `hooks/use-landlord-property-filter.ts` lo sincroniza
 * con el query param `?propiedad=` de la página activa. Por ahora solo lo consumen
 * `finances/monthly` y `finances/per-room` (ver alcance del ítem 344 en MEJORAS.md); no se aplicó
 * a mensajes/reservas en esta pasada.
 */
export const useLandlordPropertyFilterStore = create<LandlordPropertyFilterState>((set) => ({
  propiedadId: TODAS_LAS_PROPIEDADES,
  propiedades: [],
  cargando: false,
  cargadoPara: null,

  setPropiedadId: (propiedadId) => set({ propiedadId }),
  setPropiedades: (cargadoPara, propiedades) => set({ propiedades, cargadoPara }),
  setCargando: (cargando) => set({ cargando }),
}));
