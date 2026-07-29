'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import {
  servicioPropiedades,
  filtrosABusqueda,
  type BusquedaParams,
  type PaginaResultados,
} from '@/services/property-service';
import type { Filtros } from '@/schemas/search-schema';
import { notify } from '@/lib/notify';
import { track } from '@/lib/analytics';
import {
  candidatosRelajacion,
  type SugerenciaRelajacion,
} from '@/lib/relax-filters';

const PAGE_SIZE = 12;

/** Candidatos de relajación a sondear cuando hay 0 resultados (evita disparar N peticiones). */
const MAX_CANDIDATOS_RELAJACION = 2;

/**
 * Ancla de proximidad para la búsqueda geoespacial: la geolocalización del usuario
 * ("Cerca de mí", ítem 107) o el centro+radio de un área elegida en el mapa
 * ("buscar en esta zona", ítem 116). Cuando está presente, el hook pide a
 * `GET /buscar/cerca` (distancia real server-side).
 */
export interface CentroBusqueda {
  lat: number;
  lng: number;
  /** Radio en km. Opcional; el service usa 5 km por defecto. */
  radioKm?: number;
}

/**
 * Orquesta la búsqueda de propiedades sincronizada con `Filtros`, sobre TanStack Query
 * (ítem 423 — ver `docs/TANSTACK-QUERY.md`):
 *  - `useInfiniteQuery` reemplaza el `useState`+`useEffect`+`AbortController` manual
 *    (ítem 127): cada combinación de filtros/centro es su propia `queryKey`, así que
 *    cambiar de búsqueda ya no puede "pintar" una respuesta vieja — la query anterior
 *    queda en su propia entrada de caché, aislada de la que se está renderizando.
 *  - `cargarMas()` para infinite scroll con páginas reales del servidor (ver
 *    `servicioPropiedades.obtenerPaginadas`) es un `fetchNextPage()`.
 *  - Telemetría `busqueda_ejecutada` cuando una búsqueda FRESCA (página 0) resuelve (ítem 139).
 *  - Sugerencia de relajación de filtros cuando la búsqueda queda en 0 (ítem 124): sondeo
 *    best-effort fuera de la query principal (no vale la pena cachearlo).
 *
 * El 2º argumento (`centro`) alimenta la búsqueda por proximidad/área — el AGENTE DEL MAPA
 * (wave 2) lo controla para "buscar en esta zona" (ítem 116) pasando el centro+radio del
 * viewport del mapa. El resaltado card↔marcador (`hoveredId`, ítem 117) NO vive aquí sino en
 * `search-client` (estado `activeId` + prop `onHover`), porque acopla grid y mapa, no los datos.
 */
export function usePropertiesSearch(
  filtros: Filtros,
  centro?: CentroBusqueda | null,
) {
  const queryClient = useQueryClient();

  // Búsqueda completa = filtros (URL) + ancla de proximidad (geolocalización o área del mapa, fuera de URL).
  const busqueda = useMemo<BusquedaParams>(
    () => ({
      ...filtrosABusqueda(filtros),
      userLat: centro?.lat,
      userLng: centro?.lng,
      userRadioKm: centro?.radioKm,
    }),
    [filtros, centro?.lat, centro?.lng, centro?.radioKm],
  );

  const queryKey = useMemo(() => ['propiedades', 'busqueda', busqueda] as const, [busqueda]);
  // Clave canónica en texto, solo para deduplicar los efectos (telemetría/sugerencia) por búsqueda.
  const claveBusqueda = useMemo(() => JSON.stringify(busqueda), [busqueda]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      servicioPropiedades.obtenerPaginadas({ ...busqueda, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const { error: queryError, refetch } = query;

  // ── Sugerencia de relajación de filtros (ítem 124) ──────────────────────────────────
  const [sugerencia, setSugerencia] = useState<SugerenciaRelajacion | null>(null);

  const probarRelajacion = useCallback(async () => {
    const candidatos = candidatosRelajacion(filtros).slice(0, MAX_CANDIDATOS_RELAJACION);
    for (const cand of candidatos) {
      const relajada: BusquedaParams = {
        ...filtrosABusqueda({ ...filtros, ...cand.patch }),
        userLat: centro?.lat,
        userLng: centro?.lng,
        userRadioKm: centro?.radioKm,
      };
      try {
        const res = await servicioPropiedades.obtenerPaginadas({ ...relajada, page: 0, size: 1 });
        if (res.total > 0) {
          setSugerencia({ mensaje: cand.mensaje(res.total), patch: cand.patch });
          return;
        }
      } catch {
        // La sugerencia es un extra best-effort: si falla, se cae al empty state normal.
      }
    }
  }, [filtros, centro?.lat, centro?.lng, centro?.radioKm]);

  // Limpia la sugerencia anterior tan pronto arranca una búsqueda NUEVA (misma clave que
  // el `sugerencia: null` que el hook original aplicaba al iniciar `cargarPagina(0, false)`).
  useEffect(() => {
    setSugerencia(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveBusqueda]);

  // Telemetría (ítem 139) + sugerencia (ítem 124): se disparan UNA sola vez por búsqueda
  // fresca, cuando la página 0 resuelve — no en cada `cargarMas`. `procesadoRef` deduplica
  // por `claveBusqueda` (equivalente al `if (!append)` del hook original).
  const procesadoRef = useRef<string | null>(null);
  useEffect(() => {
    const primeraPagina = query.data?.pages[0];
    if (!primeraPagina) return;
    if (procesadoRef.current === claveBusqueda) return;
    procesadoRef.current = claveBusqueda;
    track('busqueda_ejecutada', { filtros, totalResultados: primeraPagina.total });
    if (primeraPagina.total === 0) void probarRelajacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, claveBusqueda]);

  // Notificación de error (equivalente al `notify.error` del catch original).
  const notificadoRef = useRef<unknown>(null);
  useEffect(() => {
    if (queryError && notificadoRef.current !== queryError) {
      notificadoRef.current = queryError;
      notify.error(queryError, 'No se pudieron cargar los cuartos');
    }
  }, [queryError]);

  const cargarMas = useCallback(() => {
    if (!query.hasNextPage || query.isLoading || query.isFetchingNextPage) return;
    void query.fetchNextPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.hasNextPage, query.isLoading, query.isFetchingNextPage, query.fetchNextPage]);

  // "Reintentar" (botón de error) reproduce el comportamiento original: vuelve a pedir SOLO
  // la página 0 (descarta cualquier página extra que ya se hubiera cargado vía "cargar más"),
  // en vez del `refetch()` por defecto de una infinite query (que re-pide TODAS las páginas
  // ya cargadas).
  const reintentar = useCallback(() => {
    queryClient.setQueryData<InfiniteData<PaginaResultados, number>>(queryKey, (old) =>
      old ? { pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) } : old,
    );
    notificadoRef.current = null;
    return refetch();
  }, [queryClient, queryKey, refetch]);

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;
  const hasMore = query.data?.pages.at(-1)?.hasMore ?? false;

  return {
    items,
    total,
    hasMore,
    cargando: query.isLoading,
    cargandoMas: query.isFetchingNextPage,
    error: query.isError,
    sugerencia,
    cargarMas,
    reintentar,
  };
}
