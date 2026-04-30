import { api } from '@/lib/api';

export interface PropiedadAdminDTO {
  id: number;
  titulo: string;
  descripcion?: string;
  precio: number;
  direccion: string;
  tipoPropiedad?: string;
  periodoAlquiler?: string;
  area?: number;
  nroPiso?: number;
  estaDisponible?: boolean;
  disponibleDesde?: string;
  serviciosIncluidos: string[];
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
};
