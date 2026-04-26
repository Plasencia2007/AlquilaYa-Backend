'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { servicioPropiedades, filtrosABusqueda } from '@/services/property-service';
import type { Filtros } from '@/schemas/search-schema';
import type { Propiedad } from '@/types/propiedad';
import { notify } from '@/lib/notify';

const PAGE_SIZE = 12;

interface State {
  items: Propiedad[];
  page: number;
  total: number;
  hasMore: boolean;
  cargando: boolean;
  cargandoMas: boolean;
  error: boolean;
}

const stateInicial: State = {
  items: [],
  page: 0,
  total: 0,
  hasMore: false,
  cargando: true,
  cargandoMas: false,
  error: false,
};

/**
 * Orquesta la búsqueda de propiedades sincronizada con `Filtros`:
 *  - Refetch cuando cambian filtros (con cancelación si llega otro request).
 *  - `cargarMas()` para infinite scroll.
 *  - Maneja loading inicial vs. loading-more vs. error.
 */
export function usePropertiesSearch(filtros: Filtros) {
  const [state, setState] = useState<State>(stateInicial);

  // Clave canónica: si cambia, refetch desde la página 0.
  const claveBusqueda = useMemo(
    () => JSON.stringify(filtrosABusqueda(filtros)),
    [filtros],
  );

  const requestId = useRef(0);

  const cargarPagina = useCallback(
    async (page: number, append: boolean) => {
      const id = ++requestId.current;
      setState((prev) => ({
        ...prev,
        cargando: !append,
        cargandoMas: append,
        error: false,
      }));

      try {
        const resultado = await servicioPropiedades.obtenerPaginadas({
          ...filtrosABusqueda(filtros),
          page,
          size: PAGE_SIZE,
        });

        if (id !== requestId.current) return;

        setState((prev) => ({
          items: append ? [...prev.items, ...resultado.items] : resultado.items,
          page: resultado.page,
          total: resultado.total,
          hasMore: resultado.hasMore,
          cargando: false,
          cargandoMas: false,
          error: false,
        }));
      } catch (err) {
        if (id !== requestId.current) return;
        notify.error(err, 'No se pudieron cargar los cuartos');
        setState((prev) => ({
          ...prev,
          cargando: false,
          cargandoMas: false,
          error: true,
        }));
      }
    },
    [filtros],
  );

  useEffect(() => {
    cargarPagina(0, false);
    // claveBusqueda asegura idempotencia (mismas filtros => no refetch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveBusqueda]);

  const cargarMas = useCallback(() => {
    if (!state.hasMore || state.cargando || state.cargandoMas) return;
    cargarPagina(state.page + 1, true);
  }, [cargarPagina, state.hasMore, state.cargando, state.cargandoMas, state.page]);

  const reintentar = useCallback(() => cargarPagina(0, false), [cargarPagina]);

  return {
    items: state.items,
    total: state.total,
    hasMore: state.hasMore,
    cargando: state.cargando,
    cargandoMas: state.cargandoMas,
    error: state.error,
    cargarMas,
    reintentar,
  };
}
