import { api } from '@/lib/api';
import type { PoliticaCancelacion, ServicioConEstado } from '@/types/propiedad';

export interface PropiedadAdminDTO {
  id: number;
  titulo: string;
  descripcion?: string;
  precio: number;
  direccion: string;
  tipoPropiedad?: string;
  periodoAlquiler?: string;
  videoUrl?: string;
  area?: number;
  nroPiso?: number;
  numDormitorios?: number;
  numBanos?: number;
  capacidadPersonas?: number;
  tieneSala?: boolean;
  tieneCocina?: boolean;
  amoblado?: boolean;
  gestionPorHabitacion?: boolean;
  estaDisponible?: boolean;
  disponibleDesde?: string;
  politicaCancelacion?: PoliticaCancelacion;
  serviciosIncluidos: string[];
  /** Servicios con estado (incluido/aparte/no disponible). */
  servicios?: ServicioConEstado[];
  reglas: string[];
  latitud?: number;
  longitud?: number;
  distanciaMetros?: number;
  aprobadoPorAdmin?: boolean;
  calificacion?: number;
  numResenas?: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  imagenes: string[];
  arrendadorId: number;
  arrendadorNombre?: string;
  arrendadorTelefono?: string;
  arrendadorCorreo?: string;
  fechaCreacion?: string;
}

export const adminPropertyService = {
  listarPendientes: async (): Promise<PropiedadAdminDTO[]> => {
    const res = await api.get<PropiedadAdminDTO[]>('admin/propiedades/pendientes');
    return Array.isArray(res.data) ? res.data : [];
  },

  obtenerDetalle: async (id: number): Promise<PropiedadAdminDTO> => {
    const res = await api.get<PropiedadAdminDTO>(`admin/propiedades/${id}`);
    return res.data;
  },

  aprobar: async (id: number): Promise<void> => {
    await api.patch(`admin/propiedades/${id}/aprobar`);
  },

  rechazar: async (id: number): Promise<void> => {
    await api.patch(`admin/propiedades/${id}/rechazar`);
  },

  /** Override de moderación: cambia la política de cancelación de una propiedad. */
  cambiarPoliticaCancelacion: async (
    id: number,
    politica: PoliticaCancelacion,
  ): Promise<void> => {
    await api.patch(`admin/propiedades/${id}/politica-cancelacion`, { politica });
  },
};
