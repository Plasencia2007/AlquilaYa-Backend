import { Propiedad } from '@/types/propiedad';
import { MOCK_PROPIEDADES } from '@/mocks/propiedades';
import { api } from '@/lib/api';
import { distanciaAUpeuKm } from '@/lib/geo';
import type { Filtros } from '@/schemas/search-schema';

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

interface PropiedadPublicoDTO {
  id: number;
  titulo: string;
  descripcion?: string;
  precio: number;
  direccion?: string;
  tipoPropiedad?: string;
  area?: number;
  estaDisponible?: boolean;
  serviciosIncluidos?: string[];
  latitud?: number;
  longitud?: number;
  calificacion?: number;
  numResenas?: number;
  estado?: string;
  imagenes?: string[];
  arrendadorId?: number;
  arrendadorNombre?: string;
}

function fromDTO(dto: PropiedadPublicoDTO): Propiedad {
  return {
    id: String(dto.id),
    titulo: dto.titulo ?? '',
    descripcion: dto.descripcion ?? '',
    precio: Number(dto.precio ?? 0),
    ubicacion: dto.direccion ?? '',
    direccion: dto.direccion ?? '',
    imagenes: dto.imagenes ?? [],
    habitaciones: 0,
    baños: 0,
    area: dto.area ?? 0,
    servicios: dto.serviciosIncluidos ?? [],
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
  orden?: 'distancia' | 'precio' | 'calificacion';
}

export interface PaginadoParams extends BusquedaParams {
  page?: number;
  size?: number;
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
    const requeridos = filtros.servicios.map((s) => s.toLowerCase());
    resultado = resultado.filter((p) => {
      const propios = p.servicios.map((s) => s.toLowerCase());
      return requeridos.every((req) => propios.some((s) => s.includes(req)));
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

  buscar: async (filtros: BusquedaParams = {}): Promise<Propiedad[]> => {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return aplicarFiltrosClient(MOCK_PROPIEDADES, filtros);
    }

    const params: Record<string, string | number> = {};
    if (filtros.zona) params.zona = filtros.zona;
    if (typeof filtros.precioMin === 'number') params.precioMin = filtros.precioMin;
    if (typeof filtros.precioMax === 'number') params.precioMax = filtros.precioMax;
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (typeof filtros.calificacionMin === 'number' && filtros.calificacionMin > 0) {
      params.calificacionMin = filtros.calificacionMin;
    }

    const response = await api.get<PropiedadPublicoDTO[]>('/propiedades/buscar', { params });
    const propiedades = response.data.map(fromDTO);
    return aplicarFiltrosClient(propiedades, {
      servicios: filtros.servicios,
      distanciaMaxKm: filtros.distanciaMaxKm,
      orden: filtros.orden,
    });
  },

  /**
   * Paginación client-side sobre el resultado de `buscar`. Si en el futuro
   * el backend expone `Page<Propiedad>`, sustituir por una llamada paginada
   * real preservando la firma.
   */
  obtenerPaginadas: async ({
    page = 0,
    size = 12,
    ...filtros
  }: PaginadoParams = {}): Promise<PaginaResultados> => {
    const completo = await servicioPropiedades.buscar(filtros);
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
export function filtrosABusqueda(f: Filtros): BusquedaParams {
  return {
    zona: f.zona,
    precioMin: f.precioMin,
    precioMax: f.precioMax,
    tipo: f.tipo,
    servicios: f.servicios,
    distanciaMaxKm: f.distanciaMaxKm,
    calificacionMin: f.calificacionMin,
    orden: f.orden,
  };
}
