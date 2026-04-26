'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { parseFiltros, serializarFiltros } from '@/lib/search-url';
import type { Filtros } from '@/schemas/search-schema';

/**
 * Filtros sincronizados con la URL como única fuente de verdad.
 *
 * - `filtros` se memoiza con `searchParams.toString()` para evitar nuevas
 *   referencias en cada render que no cambien la URL.
 * - `setFiltros` produce una query string canónica (orden de keys, arrays
 *   alfabetizados, defaults omitidos), garantizando que llamarlo con un valor
 *   ya activo no dispare navegación.
 */
export function useSearchParamsState() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const qsActual = searchParams?.toString() ?? '';

  const filtros = useMemo<Filtros>(
    () => parseFiltros(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qsActual],
  );

  const setFiltros = useCallback(
    (next: Partial<Filtros> | ((prev: Filtros) => Partial<Filtros>)) => {
      const valor = typeof next === 'function' ? next(filtros) : next;
      const merged = { ...filtros, ...valor };
      const qs = serializarFiltros(merged);
      if (qs === qsActual) return;
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [filtros, pathname, qsActual, router],
  );

  const limpiarFiltros = useCallback(() => {
    setFiltros({
      zona: undefined,
      precioMin: undefined,
      precioMax: undefined,
      tipo: undefined,
      servicios: [],
      distanciaMaxKm: undefined,
      calificacionMin: undefined,
    });
  }, [setFiltros]);

  return { filtros, setFiltros, limpiarFiltros };
}
