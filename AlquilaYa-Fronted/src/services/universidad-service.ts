import { api } from '@/lib/api';

export type TipoLimite = 'CIRCULO' | 'POLIGONO';

export interface ZonaCobertura {
  id?: number;
  universidadId?: number;
  nombre: string;
  descripcion?: string | null;
  color?: string | null;
  activo: boolean;
  ordenPrioridad: number;
  tipoLimite: TipoLimite;
  latitud?: number | null;
  longitud?: number | null;
  radioKm?: number | null;
  poligonoJson?: string | null;
  comisionPorcentaje?: number | null;
  comisionMonto?: number | null;
  fechaCreacion?: string | null;
}

export interface Universidad {
  id: number;
  nombre: string;
  descripcion?: string | null;
  color?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  activo: boolean;
  esPrincipal?: boolean;
  fechaCreacion?: string | null;
  zonas: ZonaCobertura[];
}

export interface ZonaCoberturaInput {
  nombre: string;
  descripcion?: string;
  color?: string;
  activo?: boolean;
  ordenPrioridad?: number;
  tipoLimite?: TipoLimite;
  latitud?: number;
  longitud?: number;
  radioKm?: number;
  poligonoJson?: string;
  comisionPorcentaje?: number;
  comisionMonto?: number;
}

export interface UniversidadInput {
  nombre: string;
  descripcion?: string;
  color?: string;
  latitud?: number;
  longitud?: number;
  activo?: boolean;
  esPrincipal?: boolean;
  zonas?: ZonaCoberturaInput[];
}

export interface CampusPrincipal {
  id: number;
  nombre: string;
  latitud?: number | null;
  longitud?: number | null;
  radioKm?: number | null;
}

/** Zona activa con geometría (lista plana) para resolver la zona de una propiedad. */
export interface ZonaResolucion {
  id: number;
  universidadId: number;
  universidadNombre: string;
  nombre: string;
  ordenPrioridad: number;
  tipoLimite: TipoLimite;
  latitud?: number | null;
  longitud?: number | null;
  radioKm?: number | null;
  poligonoJson?: string | null;
}

export const universidadService = {
  listarActivas: async (): Promise<Universidad[]> => {
    const response = await api.get<Universidad[]>('catalogos/universidades');
    return response.data;
  },

  listarTodas: async (): Promise<Universidad[]> => {
    const response = await api.get<Universidad[]>('catalogos/universidades/admin');
    return response.data;
  },

  obtener: async (id: number): Promise<Universidad> => {
    const response = await api.get<Universidad>(`catalogos/universidades/${id}`);
    return response.data;
  },

  crear: async (input: UniversidadInput): Promise<Universidad> => {
    const response = await api.post<Universidad>('catalogos/universidades/admin', input);
    return response.data;
  },

  actualizar: async (id: number, input: UniversidadInput): Promise<Universidad> => {
    const response = await api.put<Universidad>(`catalogos/universidades/admin/${id}`, input);
    return response.data;
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`catalogos/universidades/admin/${id}`);
  },

  /** Campus principal (endpoint público): coords + radio del campus activo, o null si no hay. */
  obtenerCampusPrincipal: async (): Promise<CampusPrincipal | null> => {
    const response = await api.get<CampusPrincipal>('catalogos/universidades/principal');
    return response.status === 204 ? null : response.data;
  },

  /** Zonas activas con geometría (endpoint público): para resolver/filtrar por zona. */
  listarZonasActivas: async (): Promise<ZonaResolucion[]> => {
    const response = await api.get<ZonaResolucion[]>('catalogos/universidades/zonas/activas');
    return Array.isArray(response.data) ? response.data : [];
  },
};
