import {
  Propiedad,
  type BadgePropiedad,
  type PoliticaCancelacion,
  type PrecioTemporada,
  type ServicioConEstado,
} from '@/types/propiedad';
import { MOCK_PROPIEDADES } from '@/mocks/propiedades';
import { api } from '@/lib/api';
import { distanciaAUpeuKm, distanciaHaversineKm } from '@/lib/geo';
import type { Filtros, Orden } from '@/schemas/search-schema';

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export interface PropiedadPublicoDTO {
  id: number;
  titulo: string;
  descripcion?: string;
  precio: number;
  precioAnterior?: number;
  videoUrl?: string;
  direccion?: string;
  tipoPropiedad?: string;
  area?: number;
  numDormitorios?: number;
  numBanos?: number;
  capacidadPersonas?: number;
  tieneSala?: boolean;
  tieneCocina?: boolean;
  amoblado?: boolean;
  gestionPorHabitacion?: boolean;
  estaDisponible?: boolean;
  serviciosIncluidos?: string[];
  servicios?: ServicioConEstado[];
  politicaCancelacion?: PoliticaCancelacion;
  temporadas?: PrecioTemporada[];
  latitud?: number;
  longitud?: number;
  calificacion?: number;
  numResenas?: number;
  estado?: string;
  imagenes?: string[];
  arrendadorId?: number;
  arrendadorNombre?: string;

  // ----- Campos premium (rediseño card). Todos opcionales -----
  reglas?: string[];
  arrendadorAvatar?: string;
  arrendadorVerificado?: boolean;
  arrendadorScore?: number;
  arrendadorNivelReputacion?: string;
  fechaCreacion?: string;
  ultimaActualizacion?: string;
  fechaActualizacion?: string;
  disponibleDesde?: string;
  vistas?: number;
  tiempoRespuestaArrendador?: number;
  badges?: BadgePropiedad[];
  /** Aviso aprobado por admin → sello "Verificado" (#47). */
  aprobadoPorAdmin?: boolean;
  /** Solo presente en `GET /propiedades/buscar/cerca`: distancia en km al punto consultado. */
  distanciaKm?: number;
}

/** Rango de fechas ocupado por una reserva activa (calendario de disponibilidad). */
export interface RangoOcupado {
  desde: string; // yyyy-MM-dd
  hasta: string; // yyyy-MM-dd
  estado: string;
}

/**
 * Conteo público de avisos por zona para la home. Espejo de `ConteoZonaDTO` del backend:
 * `total` = propiedades publicadas y visibles en la zona, `precioMin` = su precio más bajo.
 */
export interface ConteoZona {
  zonaId: number;
  total: number;
  precioMin: number;
}

export function fromDTO(dto: PropiedadPublicoDTO): Propiedad {
  return {
    id: String(dto.id),
    titulo: dto.titulo ?? '',
    descripcion: dto.descripcion ?? '',
    precio: Number(dto.precio ?? 0),
    precioAnterior: dto.precioAnterior != null ? Number(dto.precioAnterior) : undefined,
    videoUrl: dto.videoUrl,
    ubicacion: dto.direccion ?? '',
    direccion: dto.direccion ?? '',
    imagenes: dto.imagenes ?? [],
    habitaciones: dto.numDormitorios ?? 0,
    baños: dto.numBanos ?? 0,
    capacidadPersonas: dto.capacidadPersonas,
    tieneSala: dto.tieneSala,
    tieneCocina: dto.tieneCocina,
    amoblado: dto.amoblado,
    gestionPorHabitacion: dto.gestionPorHabitacion,
    area: dto.area ?? 0,
    servicios: dto.serviciosIncluidos ?? [],
    serviciosEstado: dto.servicios,
    politicaCancelacion: dto.politicaCancelacion,
    temporadas: dto.temporadas,
    propietarioId: dto.arrendadorId != null ? String(dto.arrendadorId) : '',
    propietarioNombre: dto.arrendadorNombre ?? '',
    calificacion: dto.calificacion ?? 0,
    reseñas: dto.numResenas ?? 0,
    disponible: dto.estaDisponible ?? true,
    tipo: (dto.tipoPropiedad as Propiedad['tipo']) ?? 'CUARTO',
    estado: (dto.estado as Propiedad['estado']) ?? 'PENDIENTE',
    coordenadas:
      dto.latitud != null && dto.longitud != null
        ? { lat: dto.latitud, lng: dto.longitud }
        : undefined,

    // ----- Campos premium (rediseño card) — opcionales, pasan tal cual del backend -----
    reglas: dto.reglas,
    arrendadorAvatar: dto.arrendadorAvatar,
    arrendadorVerificado: dto.arrendadorVerificado,
    arrendadorScore: dto.arrendadorScore,
    arrendadorNivelReputacion: dto.arrendadorNivelReputacion as Propiedad['arrendadorNivelReputacion'],
    fechaCreacion: dto.fechaCreacion,
    ultimaActualizacion: dto.ultimaActualizacion ?? dto.fechaActualizacion,
    disponibleDesde: dto.disponibleDesde,
    vistas: dto.vistas,
    tiempoRespuestaArrendador: dto.tiempoRespuestaArrendador,
    badges: dto.badges,
    verificado: dto.aprobadoPorAdmin ?? false,
    distanciaKm: dto.distanciaKm != null ? Number(dto.distanciaKm) : undefined,
  };
}

export interface BusquedaParams {
  zona?: string;
  /** Búsqueda de texto libre (ítem 126): server-side sobre título + descripción + dirección. */
  q?: string;
  precioMin?: number;
  precioMax?: number;
  tipo?: string;
  servicios?: string[];
  distanciaMaxKm?: number;
  calificacionMin?: number;
  universidadId?: number;
  zonaId?: number;
  capacidadMin?: number;
  dormitoriosMin?: number;
  /**
   * Toggle "solo arrendadores verificados" (ítem 125). Filtrado en CLIENTE (interino):
   * la verificación del arrendador vive en servicio-usuarios (llega vía Feign como
   * `arrendadorVerificado` en el DTO), no hay columna local en servicio-propiedades para
   * filtrarla en la query. Se aplica sobre los resultados ya enriquecidos.
   */
  soloVerificados?: boolean;
  /** Toggle "solo con fotos" (ítem 125): server-side (propiedades con ≥1 imagen). */
  soloConFotos?: boolean;
  orden?: Orden;
  /**
   * Ancla de proximidad para la búsqueda geoespacial (GET /buscar/cerca): geolocalización del
   * usuario ("Cerca de mí") o el centro de un área elegida en el mapa ("Buscar en esta zona",
   * ítem 116). NO viaja como tal al backend público `/buscar`; se traduce a lat/lng/radioKm.
   */
  userLat?: number;
  userLng?: number;
  /** Radio (km) para la búsqueda por proximidad/área. Default en el service (5 km). */
  userRadioKm?: number;
}

export interface PaginadoParams extends BusquedaParams {
  page?: number;
  size?: number;
}

/** Params de `servicioPropiedades.buscarCerca` ("Cerca de mí"): coords reales + radio (km, default 5). */
export interface BusquedaCercaParams extends BusquedaParams {
  lat: number;
  lng: number;
  radioKm?: number;
}

export interface PaginaResultados {
  items: Propiedad[];
  page: number;
  size: number;
  total: number;
  hasMore: boolean;
}

/** Espejo de `PropiedadPaginadaDTO` del backend (GET /propiedades/buscar/paginado). `pagina` es 0-based. */
interface PropiedadPaginadaResponse {
  propiedades: PropiedadPublicoDTO[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  esUltimaPagina: boolean;
}

/**
 * Aplica filtros + ordenamiento client-side. Hoy el backend no soporta
 * filtros avanzados (servicios[], distanciaMaxKm) ni ordenar por distancia,
 * así que filtramos y ordenamos en el cliente sobre el dataset completo.
 *
 * Deuda técnica: cuando el backend acepte estos parámetros, mover el filtrado
 * server-side a través de query params en `/propiedades/buscar`.
 */
function aplicarFiltrosClient(propiedades: Propiedad[], filtros: BusquedaParams): Propiedad[] {
  let resultado = propiedades.slice();

  if (filtros.zona) {
    const q = filtros.zona.toLowerCase();
    resultado = resultado.filter(
      (p) =>
        p.ubicacion.toLowerCase().includes(q) ||
        p.direccion.toLowerCase().includes(q) ||
        p.titulo.toLowerCase().includes(q),
    );
  }
  // Búsqueda de texto libre `q` (ítem 126). En backend real es server-side (título +
  // descripción + dirección); aquí replica esa semántica para el modo mocks.
  if (filtros.q && filtros.q.trim()) {
    const q = filtros.q.trim().toLowerCase();
    resultado = resultado.filter(
      (p) =>
        p.titulo.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        p.direccion.toLowerCase().includes(q) ||
        p.ubicacion.toLowerCase().includes(q),
    );
  }
  if (typeof filtros.precioMin === 'number') {
    resultado = resultado.filter((p) => p.precio >= filtros.precioMin!);
  }
  if (typeof filtros.precioMax === 'number') {
    resultado = resultado.filter((p) => p.precio <= filtros.precioMax!);
  }
  if (filtros.tipo) {
    resultado = resultado.filter((p) => p.tipo === filtros.tipo);
  }
  if (filtros.servicios && filtros.servicios.length > 0) {
    // Comparación exacta (case-insensitive) — evita falsos positivos como AGUA vs AGUA_CALIENTE.
    const requeridos = filtros.servicios.map((s) => s.toUpperCase());
    resultado = resultado.filter((p) => {
      const propios = p.servicios.map((s) => s.toUpperCase());
      return requeridos.every((req) => propios.includes(req));
    });
  }
  if (typeof filtros.distanciaMaxKm === 'number') {
    resultado = resultado.filter((p) => {
      const d = distanciaAUpeuKm(p.coordenadas);
      return d !== null && d <= filtros.distanciaMaxKm!;
    });
  }
  if (typeof filtros.calificacionMin === 'number' && filtros.calificacionMin > 0) {
    resultado = resultado.filter((p) => p.calificacion >= filtros.calificacionMin!);
  }
  // "Solo arrendadores verificados" (ítem 125): filtro CLIENTE (el flag llega vía Feign en
  // el DTO). Se aplica tanto en mocks como sobre resultados reales ya enriquecidos.
  if (filtros.soloVerificados === true) {
    resultado = resultado.filter((p) => p.arrendadorVerificado === true);
  }
  // "Solo con fotos" (ítem 125). En backend real es server-side; aquí cubre el modo mocks.
  if (filtros.soloConFotos === true) {
    resultado = resultado.filter((p) => Array.isArray(p.imagenes) && p.imagenes.length > 0);
  }

  switch (filtros.orden) {
    case 'precio':
      resultado.sort((a, b) => a.precio - b.precio);
      break;
    case 'precioDesc':
      resultado.sort((a, b) => b.precio - a.precio);
      break;
    case 'calificacion':
      resultado.sort((a, b) => b.calificacion - a.calificacion);
      break;
    case 'recientes': {
      // "Más recientes": por fecha de creación desc (los sin fecha van al final). Coincide con el
      // orden nativo del backend (fechaCreacion DESC) que usan /buscar y /buscar/paginado.
      const ts = (p: Propiedad) => (p.fechaCreacion ? Date.parse(p.fechaCreacion) : Number.NEGATIVE_INFINITY);
      resultado.sort((a, b) => ts(b) - ts(a));
      break;
    }
    case 'cercania': {
      // "Cerca de mí": ordena por distancia a la ubicación del usuario (geolocalización).
      // Si no hay coords (permiso negado / recarga), cae a distancia al campus.
      if (typeof filtros.userLat === 'number' && typeof filtros.userLng === 'number') {
        const yo = { lat: filtros.userLat, lng: filtros.userLng };
        resultado.sort((a, b) => {
          const da = a.coordenadas ? distanciaHaversineKm(a.coordenadas, yo) : Number.POSITIVE_INFINITY;
          const db = b.coordenadas ? distanciaHaversineKm(b.coordenadas, yo) : Number.POSITIVE_INFINITY;
          return da - db;
        });
        break;
      }
      resultado.sort((a, b) => {
        const da = distanciaAUpeuKm(a.coordenadas) ?? Number.POSITIVE_INFINITY;
        const db = distanciaAUpeuKm(b.coordenadas) ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
      break;
    }
    case 'distancia':
    default: {
      resultado.sort((a, b) => {
        const da = distanciaAUpeuKm(a.coordenadas) ?? Number.POSITIVE_INFINITY;
        const db = distanciaAUpeuKm(b.coordenadas) ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
    }
  }

  return resultado;
}

/**
 * Traduce `BusquedaParams` a los query params que aceptan `/buscar` y `/buscar/paginado`
 * (mismos filtros escalares). `distanciaMax` viaja en metros; `servicios` como repetición
 * de clave (el backend hace OR). `calificacionMin` YA es server-side (B4). No incluye `orden`
 * (solo `/buscar/paginado` lo soporta; lo añade su propio caller) ni `page`/`size`.
 */
function construirParamsBackend(filtros: BusquedaParams): Record<string, string | number | string[]> {
  const params: Record<string, string | number | string[]> = {};
  if (filtros.zona) params.zona = filtros.zona;
  // Texto libre `q` (ítem 126) → server-side; el backend arma el patrón LIKE (%q%).
  if (filtros.q && filtros.q.trim()) params.q = filtros.q.trim();
  // "Solo con fotos" (ítem 125) → server-side (propiedades con ≥1 imagen).
  if (filtros.soloConFotos === true) params.soloConFotos = 'true';
  // "Solo arrendadores verificados" (ítem 125) → server-side: el backend resuelve el
  // conjunto de arrendadores verificados contra servicio-usuarios (cacheado) y filtra
  // por `arrendadorId IN (...)`. Ya no se re-filtra en cliente.
  if (filtros.soloVerificados === true) params.soloVerificados = 'true';
  if (typeof filtros.precioMin === 'number') params.precioMin = filtros.precioMin;
  if (typeof filtros.precioMax === 'number') params.precioMax = filtros.precioMax;
  if (filtros.tipo) params.tipo = filtros.tipo;
  if (typeof filtros.universidadId === 'number') params.universidadId = filtros.universidadId;
  if (typeof filtros.zonaId === 'number') params.zonaId = filtros.zonaId;
  if (typeof filtros.capacidadMin === 'number' && filtros.capacidadMin > 0) params.capacidadMin = filtros.capacidadMin;
  if (typeof filtros.dormitoriosMin === 'number' && filtros.dormitoriosMin > 0) params.dormitoriosMin = filtros.dormitoriosMin;
  // distanciaMax → backend espera metros (Integer)
  if (typeof filtros.distanciaMaxKm === 'number') params.distanciaMax = Math.round(filtros.distanciaMaxKm * 1000);
  // calificacionMin → server-side (B4). Solo se envía si > 0 (0 = "sin filtro").
  if (typeof filtros.calificacionMin === 'number' && filtros.calificacionMin > 0) params.calificacionMin = filtros.calificacionMin;
  // servicios → backend hace OR (al menos uno); el client-side hace AND (todos presentes)
  if (filtros.servicios && filtros.servicios.length > 0) params.servicios = filtros.servicios;
  return params;
}

/** Órdenes que `/buscar/paginado` resuelve server-side (paginación real). El resto (distancia al
 * campus) se ordena en el cliente; la proximidad real usa `/buscar/cerca`. */
const ORDENES_SERVIDOR = new Set<Orden>(['precio', 'precioDesc', 'recientes', 'calificacion']);

/** Serializa params repitiendo la clave por cada elemento de un array (servicios=a&servicios=b). */
function serializarParams(p: Record<string, string | number | string[]>): string {
  const sp = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((item) => sp.append(k, item));
    else sp.append(k, String(v));
  });
  return sp.toString();
}

export const servicioPropiedades = {
  obtenerTodas: async (): Promise<Propiedad[]> => {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return MOCK_PROPIEDADES;
    }
    const response = await api.get<Propiedad[]>('/propiedades');
    return response.data;
  },

  obtenerPorId: async (id: string): Promise<Propiedad | null> => {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return MOCK_PROPIEDADES.find((p) => p.id === id) ?? null;
    }
    const response = await api.get<PropiedadPublicoDTO>(`/propiedades/${id}/publico`);
    return fromDTO(response.data);
  },

  /** Propiedades similares para la sección "También te puede interesar" de la ficha. */
  obtenerSimilares: async (id: string | number, limit = 4): Promise<Propiedad[]> => {
    if (USE_MOCKS) return [];
    const { data } = await api.get<PropiedadPublicoDTO[]>(
      `/propiedades/${id}/similares?limit=${limit}`,
    );
    return Array.isArray(data) ? data.map(fromDTO) : [];
  },

  /** Rangos de fechas ocupados por reservas activas (para pintar disponibilidad en la ficha). */
  obtenerCalendario: async (id: string | number): Promise<RangoOcupado[]> => {
    if (USE_MOCKS) return [];
    const { data } = await api.get<RangoOcupado[]>(`/propiedades/${id}/calendario`);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Conteo público de avisos por zona (número + precio mínimo) para la home. UNA sola
   * petición ligera: el backend agrega en BD (GROUP BY zonaId) con el mismo criterio de
   * "publicada y visible" que `buscar`. No trae el catálogo de propiedades.
   */
  conteoPorZona: async (): Promise<ConteoZona[]> => {
    if (USE_MOCKS) return [];
    const { data } = await api.get<ConteoZona[]>('/propiedades/conteo-por-zona');
    return Array.isArray(data) ? data : [];
  },

  buscar: async (filtros: BusquedaParams = {}): Promise<Propiedad[]> => {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return aplicarFiltrosClient(MOCK_PROPIEDADES, filtros);
    }

    const response = await api.get<PropiedadPublicoDTO[]>('/propiedades/buscar', {
      params: construirParamsBackend(filtros),
      paramsSerializer: serializarParams,
    });
    const propiedades = response.data.map(fromDTO);
    // Re-filtro/orden client-side de lo que el backend NO resuelve por este endpoint:
    // servicios con semántica AND (el backend hace OR) y el ordenamiento elegido (`/buscar` no
    // ordena por el criterio del usuario). `distanciaMaxKm` (al campus) se re-filtra por si el
    // backend tiene distanciaMetros NULL. `calificacionMin`, `q` y `soloConFotos` NO se
    // re-filtran: ya los resolvió el backend server-side. `soloVerificados` (ítem 125) también
    // es server-side ahora (arrendadorId IN contra el conjunto verificado de servicio-usuarios).
    return aplicarFiltrosClient(propiedades, {
      servicios: filtros.servicios,
      distanciaMaxKm: filtros.distanciaMaxKm,
      orden: filtros.orden,
      userLat: filtros.userLat,
      userLng: filtros.userLng,
    });
  },

  /**
   * "Cerca de mí" PAGINADO: busca contra `GET /propiedades/buscar/cerca` con las coordenadas
   * reales del usuario (geolocalización). El backend filtra por radio, ORDENA por distancia
   * ascendente y PAGINA server-side (page/size), devolviendo `PropiedadPaginadaDTO` con
   * `distanciaKm` por item. Preserva el infinite scroll pidiendo páginas reales al servidor.
   *
   * Reenvía server-side los filtros que ese endpoint soporta (precio, tipo, universidad/zona,
   * capacidad/dormitorios y `calificacionMin` — este último ya server-side, B4). Lo que queda
   * en el CLIENTE, aplicado sobre la página recibida y SIN reordenar (para no romper el orden por
   * distancia real del backend):
   *  - `servicios` con semántica AND (el backend no filtra servicios en este endpoint).
   *  - `distanciaMaxKm` al campus (constraint distinta del radio de proximidad).
   * Nota: al filtrar en cliente por página, una página puede quedar con menos de `size` ítems
   * (el offset lo lleva el servidor, así que no se pierden ni duplican resultados entre páginas;
   * solo el total puede sobre-contar). Aceptable para el scroll infinito.
   */
  buscarCerca: async ({
    lat,
    lng,
    radioKm = 5,
    page = 0,
    size = 12,
    ...filtros
  }: BusquedaCercaParams & { page?: number; size?: number }): Promise<PaginaResultados> => {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const completo = aplicarFiltrosClient(MOCK_PROPIEDADES, {
        ...filtros,
        orden: 'cercania',
        userLat: lat,
        userLng: lng,
      });
      const inicio = page * size;
      const items = completo.slice(inicio, inicio + size);
      return { items, page, size, total: completo.length, hasMore: inicio + items.length < completo.length };
    }

    const params: Record<string, string | number> = { lat, lng, radioKm, page, size };
    if (typeof filtros.precioMin === 'number') params.precioMin = filtros.precioMin;
    if (typeof filtros.precioMax === 'number') params.precioMax = filtros.precioMax;
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (typeof filtros.universidadId === 'number') params.universidadId = filtros.universidadId;
    if (typeof filtros.zonaId === 'number') params.zonaId = filtros.zonaId;
    if (typeof filtros.capacidadMin === 'number' && filtros.capacidadMin > 0) params.capacidadMin = filtros.capacidadMin;
    if (typeof filtros.dormitoriosMin === 'number' && filtros.dormitoriosMin > 0) params.dormitoriosMin = filtros.dormitoriosMin;
    if (typeof filtros.calificacionMin === 'number' && filtros.calificacionMin > 0) params.calificacionMin = filtros.calificacionMin;
    // Texto libre `q` (126) y "solo con fotos" (125): server-side también en este endpoint.
    if (filtros.q && filtros.q.trim()) params.q = filtros.q.trim();
    if (filtros.soloConFotos === true) params.soloConFotos = 'true';
    // "Solo verificados" (ítem 125): server-side (antes era filtro cliente sobre la página, con
    // el trade-off documentado de páginas con menos de `size` ítems — ya no aplica).
    if (filtros.soloVerificados === true) params.soloVerificados = 'true';

    const { data } = await api.get<PropiedadPaginadaResponse>('/propiedades/buscar/cerca', { params });
    let items = (data.propiedades ?? []).map(fromDTO);
    // Filtro cliente que el backend NO resuelve en este endpoint, aplicado sobre la página SIN
    // reordenar (el backend ya ordenó por distancia y adjuntó distanciaKm).
    const requeridos = (filtros.servicios ?? []).map((s) => s.toUpperCase());
    if (requeridos.length > 0) {
      items = items.filter((p) => {
        const propios = p.servicios.map((s) => s.toUpperCase());
        return requeridos.every((req) => propios.includes(req));
      });
    }
    if (typeof filtros.distanciaMaxKm === 'number') {
      items = items.filter((p) => {
        const d = distanciaAUpeuKm(p.coordenadas);
        return d !== null && d <= filtros.distanciaMaxKm!;
      });
    }
    return {
      items,
      page: data.pagina,
      size: data.tamano,
      total: data.totalElementos,
      hasMore: !data.esUltimaPagina,
    };
  },

  /**
   * Paginación REAL server-side contra `GET /propiedades/buscar/paginado` (page/size). El backend
   * devuelve solo la página pedida + metadatos (total, última página), así el infinite scroll pide
   * páginas reales al servidor en vez de traer todo y trocear en cliente.
   *
   * Ese endpoint ahora ordena server-side según `orden` (precio, precioDesc, recientes,
   * calificacion) y filtra `servicios` con OR + `calificacionMin` server-side. NO resuelve la
   * semántica AND de servicios ni el orden "distancia al campus"; por eso el caller
   * (`obtenerPaginadas`) solo lo usa cuando esos casos no aplican.
   */
  buscarPaginado: async ({
    page = 0,
    size = 12,
    ...filtros
  }: PaginadoParams = {}): Promise<PaginaResultados> => {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const completo = aplicarFiltrosClient(MOCK_PROPIEDADES, { ...filtros, orden: filtros.orden ?? 'recientes' });
      const inicio = page * size;
      const items = completo.slice(inicio, inicio + size);
      return { items, page, size, total: completo.length, hasMore: inicio + items.length < completo.length };
    }

    const params: Record<string, string | number | string[]> = { ...construirParamsBackend(filtros), page, size };
    // `orden` solo se envía si el backend lo resuelve server-side (el resto lo ordena el cliente).
    if (filtros.orden && ORDENES_SERVIDOR.has(filtros.orden)) params.orden = filtros.orden;
    const { data } = await api.get<PropiedadPaginadaResponse>('/propiedades/buscar/paginado', {
      params,
      paramsSerializer: serializarParams,
    });
    return {
      items: (data.propiedades ?? []).map(fromDTO),
      page: data.pagina,
      size: data.tamano,
      total: data.totalElementos,
      hasMore: !data.esUltimaPagina,
    };
  },

  /**
   * Página de resultados para el infinite scroll. Elige la estrategia correcta según el orden y
   * los filtros activos, maximizando la paginación server-side sin perder correctitud:
   *
   *  1. **Proximidad/área** (hay `userLat`/`userLng`: "Cerca de mí" o "buscar en esta zona"):
   *     `GET /buscar/cerca` paginado (distancia real Haversine, orden ascendente + `distanciaKm`
   *     por item, page/size server-side).
   *  2. **Paginación real server-side** (orden en {precio, precioDesc, recientes, calificacion} y
   *     con ≤1 servicio → el backend ordena y filtra por página, incluyendo `calificacionMin`):
   *     `GET /buscar/paginado`.
   *  3. **Fallback** (orden "distancia al campus", o AND de 2+ servicios): se trae la lista completa
   *     cacheada (`/buscar`) y se ordena/filtra/trocea en cliente, porque requiere ver TODO el
   *     dataset (el backend no ordena por distancia-al-campus ni hace AND de servicios).
   */
  obtenerPaginadas: async ({
    page = 0,
    size = 12,
    ...filtros
  }: PaginadoParams = {}): Promise<PaginaResultados> => {
    // 1. Búsqueda por proximidad / área (distancia real server-side, paginada).
    if (typeof filtros.userLat === 'number' && typeof filtros.userLng === 'number') {
      return servicioPropiedades.buscarCerca({
        ...filtros,
        lat: filtros.userLat,
        lng: filtros.userLng,
        radioKm: filtros.userRadioKm,
        page,
        size,
      });
    }

    // 2. ¿Se puede pedir la página exacta al servidor? Solo si el orden lo resuelve el backend y
    //    no hay filtros que se apliquen en CLIENTE sobre la página (abrirían huecos): AND de 2+
    //    servicios. "solo verificados" ya NO cuenta aquí — es server-side (ítem 125).
    const requiereFiltroCliente = (filtros.servicios?.length ?? 0) >= 2;
    if (filtros.orden && ORDENES_SERVIDOR.has(filtros.orden) && !requiereFiltroCliente) {
      return servicioPropiedades.buscarPaginado({ page, size, ...filtros });
    }

    // 3. Fallback: lista completa + orden/filtro/troceo en cliente (orden distancia-al-campus,
    //    o AND de 2+ servicios).
    const completo = await servicioPropiedades.buscar(filtros);
    const inicio = page * size;
    const items = completo.slice(inicio, inicio + size);
    return { items, page, size, total: completo.length, hasMore: inicio + items.length < completo.length };
  },

  obtenerDestacadas: async (n = 4): Promise<Propiedad[]> => {
    const todas = await servicioPropiedades.buscar({});
    const disponibles = todas.filter((p) => p.disponible);
    return aplicarFiltrosClient(disponibles, { orden: 'distancia' }).slice(0, n);
  },
};

/** Helper para convertir `Filtros` (URL) en `BusquedaParams` (servicio). */
/** Motivos de denuncia de una publicación (#46), espejo del enum del backend. */
export type MotivoDenuncia =
  | 'FRAUDE'
  | 'INFO_FALSA'
  | 'DUPLICADO'
  | 'CONTACTO_EXTERNO'
  | 'INAPROPIADO'
  | 'OTRO';

/**
 * Denuncia una publicación (requiere sesión). Lanza si el usuario ya la había
 * reportado (el backend responde 409).
 */
export async function denunciarPropiedad(
  id: string | number,
  motivo: MotivoDenuncia,
  descripcion?: string,
): Promise<void> {
  await api.post(`propiedades/${id}/denuncias`, { motivo, descripcion });
}

/**
 * Registra un evento de contacto para la analítica del arrendador (#52). Best-effort:
 * nunca debe romper el flujo de mensajería, por eso se traga cualquier error.
 *
 * Devuelve el teléfono del arrendador si el backend lo resolvió (#153): recién se
 * revela aquí, tras registrar la intención de contacto, no antes.
 */
export async function registrarContacto(id: string | number): Promise<{ telefono?: string }> {
  try {
    const res = await api.post(`propiedades/${id}/contacto`);
    return { telefono: res.data?.telefono };
  } catch {
    /* no-op: el evento es solo analítica */
    return {};
  }
}

/**
 * Registra una vista pública de la ficha (#162), una vez por sesión (dedupe vía
 * `sessionStorage` en la página, no aquí). Best-effort: analítica, nunca bloquea la UX.
 */
export async function registrarVista(id: string | number): Promise<void> {
  try {
    await api.post(`propiedades/${id}/vista`);
  } catch {
    /* no-op: el evento es solo analítica */
  }
}

/** Punto de interés cercano a una propiedad (#157), resuelto y cacheado en el backend. */
export interface LugarCercano {
  categoria: 'universidad' | 'mercado' | 'farmacia' | 'banco' | 'paradero';
  nombre: string;
  lat: number;
  lng: number;
  distanciaM: number;
}

/** Tiempo real caminando desde una propiedad a un destino (#158), resuelto vía OSRM en el backend. */
export interface TiempoCaminando {
  minutos: number;
  distanciaKm: number;
  /** true si OSRM no respondió y se cayó a una estimación en línea recta. */
  aproximado: boolean;
}

/**
 * Puntos de interés cercanos a una propiedad (universidad/mercado/farmacia/banco/paradero
 * en ~1200m), vía el proxy cacheado del backend (#157) — ya no se golpea Overpass directo
 * desde el navegador. Falla silenciosa: si el backend no responde, devuelve `[]`.
 */
export async function obtenerLugaresCercanos(id: string | number): Promise<LugarCercano[]> {
  try {
    const { data } = await api.get<LugarCercano[]>(`propiedades/${id}/lugares-cercanos`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Tiempo real caminando desde una propiedad a un destino (#158), vía el proxy cacheado
 * del backend (OSRM) — ya no se golpea el servidor demo directo desde el navegador.
 */
export async function obtenerTiempoCaminando(
  id: string | number,
  destinoLat: number,
  destinoLng: number,
): Promise<TiempoCaminando | null> {
  try {
    const { data } = await api.get<TiempoCaminando>(`propiedades/${id}/tiempo-caminando`, {
      params: { destinoLat, destinoLng },
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export function filtrosABusqueda(f: Filtros): BusquedaParams {
  return {
    zona: f.zona,
    q: f.q,
    precioMin: f.precioMin,
    precioMax: f.precioMax,
    tipo: f.tipo,
    servicios: f.servicios,
    distanciaMaxKm: f.distanciaMaxKm,
    calificacionMin: f.calificacionMin,
    universidadId: f.universidadId,
    zonaId: f.zonaId,
    capacidadMin: f.capacidadMin,
    dormitoriosMin: f.dormitoriosMin,
    soloVerificados: f.soloVerificados,
    soloConFotos: f.soloConFotos,
    orden: f.orden,
  };
}
