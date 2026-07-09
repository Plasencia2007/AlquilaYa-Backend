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
import type { Filtros } from '@/schemas/search-schema';

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
  orden?: 'distancia' | 'cercania' | 'precio' | 'calificacion';
  /** Coordenadas del usuario (geolocalización) para ordenar por "cerca de mí". No viaja al backend. */
  userLat?: number;
  userLng?: number;
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

  switch (filtros.orden) {
    case 'precio':
      resultado.sort((a, b) => a.precio - b.precio);
      break;
    case 'calificacion':
      resultado.sort((a, b) => b.calificacion - a.calificacion);
      break;
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

  buscar: async (filtros: BusquedaParams = {}): Promise<Propiedad[]> => {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return aplicarFiltrosClient(MOCK_PROPIEDADES, filtros);
    }

    const params: Record<string, string | number | string[]> = {};
    if (filtros.zona) params.zona = filtros.zona;
    if (typeof filtros.precioMin === 'number') params.precioMin = filtros.precioMin;
    if (typeof filtros.precioMax === 'number') params.precioMax = filtros.precioMax;
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (typeof filtros.universidadId === 'number') params.universidadId = filtros.universidadId;
    if (typeof filtros.zonaId === 'number') params.zonaId = filtros.zonaId;
    if (typeof filtros.capacidadMin === 'number' && filtros.capacidadMin > 0) params.capacidadMin = filtros.capacidadMin;
    if (typeof filtros.dormitoriosMin === 'number' && filtros.dormitoriosMin > 0) params.dormitoriosMin = filtros.dormitoriosMin;
    // distanciaMax → backend espera metros (Integer)
    if (typeof filtros.distanciaMaxKm === 'number') params.distanciaMax = Math.round(filtros.distanciaMaxKm * 1000);
    // servicios → backend hace OR (al menos uno); el client-side hace AND (todos presentes)
    if (filtros.servicios && filtros.servicios.length > 0) params.servicios = filtros.servicios;

    const response = await api.get<PropiedadPublicoDTO[]>('/propiedades/buscar', {
      params,
      paramsSerializer: (p) => {
        const sp = new URLSearchParams();
        Object.entries(p).forEach(([k, v]) => {
          if (Array.isArray(v)) v.forEach((item) => sp.append(k, item));
          else sp.append(k, String(v));
        });
        return sp.toString();
      },
    });
    const propiedades = response.data.map(fromDTO);
    return aplicarFiltrosClient(propiedades, {
      servicios: filtros.servicios,
      distanciaMaxKm: filtros.distanciaMaxKm,
      orden: filtros.orden,
      userLat: filtros.userLat,
      userLng: filtros.userLng,
    });
  },

  /**
   * "Cerca de mí": busca contra `GET /propiedades/buscar/cerca` con las coordenadas
   * reales del usuario (geolocalización). El backend filtra por radio y devuelve los
   * resultados YA ordenados por distancia ascendente, con `distanciaKm` por item.
   *
   * Solo reenvía los filtros que ese endpoint soporta server-side (precio, tipo,
   * universidad/zona, capacidad/dormitorios). `servicios`, `distanciaMaxKm` (al campus)
   * y `calificacionMin` no tienen soporte server-side (igual que en `buscar`), así que se
   * aplican en el cliente sin volver a ordenar (para no perder el orden por distancia real
   * que ya viene del backend).
   */
  buscarCerca: async ({
    lat,
    lng,
    radioKm = 5,
    ...filtros
  }: BusquedaCercaParams): Promise<Propiedad[]> => {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return aplicarFiltrosClient(MOCK_PROPIEDADES, {
        ...filtros,
        orden: 'cercania',
        userLat: lat,
        userLng: lng,
      });
    }

    const params: Record<string, string | number> = { lat, lng, radioKm };
    if (typeof filtros.precioMin === 'number') params.precioMin = filtros.precioMin;
    if (typeof filtros.precioMax === 'number') params.precioMax = filtros.precioMax;
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (typeof filtros.universidadId === 'number') params.universidadId = filtros.universidadId;
    if (typeof filtros.zonaId === 'number') params.zonaId = filtros.zonaId;
    if (typeof filtros.capacidadMin === 'number' && filtros.capacidadMin > 0) params.capacidadMin = filtros.capacidadMin;
    if (typeof filtros.dormitoriosMin === 'number' && filtros.dormitoriosMin > 0) params.dormitoriosMin = filtros.dormitoriosMin;

    const response = await api.get<PropiedadPublicoDTO[]>('/propiedades/buscar/cerca', { params });
    const propiedades = response.data.map(fromDTO);
    // orden: 'cercania' con userLat/userLng reordena por Haversine cliente-servidor sobre
    // las MISMAS coordenadas que ya usó el backend, así que preserva el orden por distancia.
    return aplicarFiltrosClient(propiedades, {
      servicios: filtros.servicios,
      distanciaMaxKm: filtros.distanciaMaxKm,
      calificacionMin: filtros.calificacionMin,
      orden: 'cercania',
      userLat: lat,
      userLng: lng,
    });
  },

  /**
   * Paginación client-side sobre el resultado de `buscar` (o `buscarCerca` cuando hay
   * coordenadas de usuario). Si en el futuro el backend expone `Page<Propiedad>`,
   * sustituir por una llamada paginada real preservando la firma.
   */
  obtenerPaginadas: async ({
    page = 0,
    size = 12,
    ...filtros
  }: PaginadoParams = {}): Promise<PaginaResultados> => {
    const completo =
      typeof filtros.userLat === 'number' && typeof filtros.userLng === 'number'
        ? await servicioPropiedades.buscarCerca({ ...filtros, lat: filtros.userLat, lng: filtros.userLng })
        : await servicioPropiedades.buscar(filtros);
    const inicio = page * size;
    const items = completo.slice(inicio, inicio + size);
    return {
      items,
      page,
      size,
      total: completo.length,
      hasMore: inicio + items.length < completo.length,
    };
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
 */
export async function registrarContacto(id: string | number): Promise<void> {
  try {
    await api.post(`propiedades/${id}/contacto`);
  } catch {
    /* no-op: el evento es solo analítica */
  }
}

export function filtrosABusqueda(f: Filtros): BusquedaParams {
  return {
    zona: f.zona,
    precioMin: f.precioMin,
    precioMax: f.precioMax,
    tipo: f.tipo,
    servicios: f.servicios,
    distanciaMaxKm: f.distanciaMaxKm,
    calificacionMin: f.calificacionMin,
    universidadId: f.universidadId,
    zonaId: f.zonaId,
    orden: f.orden,
  };
}
