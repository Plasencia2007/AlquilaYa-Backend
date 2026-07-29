import { create } from 'zustand';

import { servicioPropiedades, filtrosABusqueda } from '@/services/property-service';
import type { Filtros } from '@/schemas/search-schema';

/**
 * Distribución de precios de la oferta actual, para el mini-histograma del slider de
 * precio (ítem 111). `filters-sheet` no recibe la lista de resultados por props (añadirla
 * obligaría a tocar `search-client`, fuera de alcance), así que el histograma obtiene sus
 * propios datos con una petición ligera a `GET /propiedades/buscar` — la misma que ya usa
 * la búsqueda — EXCLUYENDO el rango de precio, para reflejar toda la oferta bajo el resto
 * de filtros (estilo Airbnb). Se cachea por firma de filtros para no repetir la petición.
 */

/** Firma de los filtros que afectan a la distribución: todo MENOS precio/orden/vista. */
function firmaFiltros(f: Filtros): string {
  return JSON.stringify({
    zona: f.zona ?? '',
    tipo: f.tipo ?? '',
    servicios: [...(f.servicios ?? [])].sort(),
    distanciaMaxKm: f.distanciaMaxKm ?? null,
    calificacionMin: f.calificacionMin ?? null,
    universidadId: f.universidadId ?? null,
    zonaId: f.zonaId ?? null,
    capacidadMin: f.capacidadMin ?? null,
    dormitoriosMin: f.dormitoriosMin ?? null,
  });
}

interface PriceDistributionState {
  firma: string | null;
  precios: number[];
  conDatos: boolean;
  cargando: boolean;
  reqId: number;
  cargar: (filtros: Filtros) => Promise<void>;
}

export const usePriceDistributionStore = create<PriceDistributionState>((set, get) => ({
  firma: null,
  precios: [],
  conDatos: false,
  cargando: false,
  reqId: 0,

  cargar: async (filtros) => {
    const firma = firmaFiltros(filtros);
    const st = get();
    // Ya resuelto (o en curso) para esta combinación de filtros → no repetir la petición.
    if (st.firma === firma && (st.conDatos || st.cargando)) return;

    const reqId = st.reqId + 1;
    set({ firma, cargando: true, reqId });

    try {
      const busqueda = filtrosABusqueda({
        ...filtros,
        precioMin: undefined,
        precioMax: undefined,
      });
      const propiedades = await servicioPropiedades.buscar(busqueda);
      if (get().reqId !== reqId) return; // otra petición la reemplazó
      const precios = propiedades
        .map((p) => p.precio)
        .filter((n) => Number.isFinite(n) && n > 0);
      set({ precios, conDatos: precios.length > 0, cargando: false });
    } catch {
      if (get().reqId !== reqId) return;
      set({ precios: [], conDatos: false, cargando: false });
    }
  },
}));
