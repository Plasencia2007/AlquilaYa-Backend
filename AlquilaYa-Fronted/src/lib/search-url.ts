import {
  filtrosSchema,
  ORDENES,
  TIPOS_PROPIEDAD,
  VISTAS,
  type Filtros,
} from '@/schemas/search-schema';

/**
 * Lee `URLSearchParams` y devuelve un objeto `Filtros` validado. Los valores
 * inválidos se descartan (se quedan con su default del schema).
 */
export function parseFiltros(params: URLSearchParams | null): Filtros {
  if (!params) return filtrosSchema.parse({});

  const get = (k: string) => params.get(k) ?? undefined;
  const getNum = (k: string): number | undefined => {
    const v = get(k);
    if (v === undefined || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const tipo = get('tipo');
  const orden = get('orden');
  const view = get('view');

  const serviciosRaw = get('servicios');
  const servicios = serviciosRaw
    ? serviciosRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const candidato = {
    zona: get('zona'),
    precioMin: getNum('precioMin'),
    precioMax: getNum('precioMax'),
    tipo: TIPOS_PROPIEDAD.includes(tipo as never) ? tipo : undefined,
    servicios,
    distanciaMaxKm: getNum('distanciaMaxKm'),
    calificacionMin: getNum('calificacionMin'),
    orden: ORDENES.includes(orden as never) ? orden : undefined,
    view: VISTAS.includes(view as never) ? view : undefined,
  };

  const result = filtrosSchema.safeParse(candidato);
  return result.success ? result.data : filtrosSchema.parse({});
}

/**
 * Serializa filtros a query string canónica e idempotente:
 *  - Llaves ordenadas alfabéticamente
 *  - Arrays alfabetizados
 *  - Defaults omitidos (orden='distancia', view='lista', servicios=[])
 *  - Strings vacíos / undefined / NaN omitidos
 *
 * Esto garantiza que el mismo conjunto de filtros siempre produce la misma
 * URL — clave para evitar loops de re-render con `useSearchParams`.
 */
export function serializarFiltros(filtros: Partial<Filtros>): string {
  const entries: Array<[string, string]> = [];

  if (filtros.zona && filtros.zona.trim()) entries.push(['zona', filtros.zona.trim()]);
  if (typeof filtros.precioMin === 'number' && Number.isFinite(filtros.precioMin)) {
    entries.push(['precioMin', String(filtros.precioMin)]);
  }
  if (typeof filtros.precioMax === 'number' && Number.isFinite(filtros.precioMax)) {
    entries.push(['precioMax', String(filtros.precioMax)]);
  }
  if (filtros.tipo) entries.push(['tipo', filtros.tipo]);
  if (filtros.servicios && filtros.servicios.length > 0) {
    const ordenados = [...filtros.servicios].sort((a, b) => a.localeCompare(b));
    entries.push(['servicios', ordenados.join(',')]);
  }
  if (
    typeof filtros.distanciaMaxKm === 'number' &&
    Number.isFinite(filtros.distanciaMaxKm)
  ) {
    entries.push(['distanciaMaxKm', String(filtros.distanciaMaxKm)]);
  }
  if (
    typeof filtros.calificacionMin === 'number' &&
    Number.isFinite(filtros.calificacionMin) &&
    filtros.calificacionMin > 0
  ) {
    entries.push(['calificacionMin', String(filtros.calificacionMin)]);
  }
  if (filtros.orden && filtros.orden !== 'distancia') entries.push(['orden', filtros.orden]);
  if (filtros.view && filtros.view !== 'lista') entries.push(['view', filtros.view]);

  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return new URLSearchParams(entries).toString();
}

/**
 * Cuántos filtros activos (excluyendo orden y view, que no son "filtros"
 * sino preferencias). Útil para el badge en el botón "Filtros (N)".
 */
export function contarFiltrosActivos(filtros: Filtros): number {
  let n = 0;
  if (filtros.zona && filtros.zona.trim()) n++;
  if (typeof filtros.precioMin === 'number') n++;
  if (typeof filtros.precioMax === 'number') n++;
  if (filtros.tipo) n++;
  if (filtros.servicios.length > 0) n++;
  if (typeof filtros.distanciaMaxKm === 'number') n++;
  if (typeof filtros.calificacionMin === 'number' && filtros.calificacionMin > 0) n++;
  return n;
}
