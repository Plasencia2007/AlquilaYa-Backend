import { api } from '@/lib/api';
import type { PropiedadBackend, PoliticaCancelacion, ServicioConEstado } from '@/types/propiedad';

/** Payload lenient de borrador: todos los campos opcionales (el inmueble puede estar incompleto). */
export interface BorradorPayload {
  titulo?: string;
  descripcion?: string;
  precio?: number;
  /** Depósito de garantía (S/), adicional a la renta. */
  deposito?: number;
  direccion?: string;
  ubicacionGps?: string;
  tipoPropiedad?: string;
  periodoAlquiler?: string;
  area?: number;
  nroPiso?: number;
  numDormitorios?: number;
  numBanos?: number;
  capacidadPersonas?: number;
  tieneSala?: boolean;
  tieneCocina?: boolean;
  amoblado?: boolean;
  gestionPorHabitacion?: boolean;
  latitud?: number;
  longitud?: number;
  serviciosIncluidos?: string[];
  servicios?: ServicioConEstado[];
  reglas?: string[];
  estaDisponible?: boolean;
  disponibleDesde?: string;
  videoUrl?: string;
  politicaCancelacion?: PoliticaCancelacion;
}

/** Borradores de propiedad gestionados en el servidor (estado BORRADOR). */
export const borradorService = {
  listar: async (): Promise<PropiedadBackend[]> => {
    const { data } = await api.get<PropiedadBackend[]>('/propiedades/borradores');
    return Array.isArray(data) ? data : [];
  },

  crear: async (payload: BorradorPayload): Promise<PropiedadBackend> => {
    const { data } = await api.post<PropiedadBackend>('/propiedades/borradores', payload);
    return data;
  },

  actualizar: async (id: number, payload: BorradorPayload): Promise<PropiedadBackend> => {
    const { data } = await api.put<PropiedadBackend>(`/propiedades/borradores/${id}`, payload);
    return data;
  },

  /** Valida y publica el borrador (pasa a PENDIENTE). Devuelve la propiedad publicada. */
  publicar: async (id: number): Promise<PropiedadBackend> => {
    const { data } = await api.post<PropiedadBackend>(`/propiedades/borradores/${id}/publicar`);
    return data;
  },

  /** Programa la publicación para una fecha futura (ISO yyyy-MM-ddTHH:mm). Valida que sea publicable. */
  programar: async (id: number, fechaIso: string): Promise<PropiedadBackend> => {
    const { data } = await api.post<PropiedadBackend>(`/propiedades/borradores/${id}/programar`, { fecha: fechaIso });
    return data;
  },

  /** Cancela la programación de publicación de un borrador. */
  cancelarProgramacion: async (id: number): Promise<void> => {
    await api.delete(`/propiedades/borradores/${id}/programar`);
  },
};
