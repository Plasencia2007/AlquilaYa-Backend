import { api } from '@/lib/api';

/** Reseña tal como la devuelve el backend para moderación (ResenaResponseDTO). */
export interface ResenaModeracion {
  id: number;
  tipo: string;
  targetId: number; // propiedadId
  estudianteId?: number;
  estudianteNombre?: string;
  rating: number;
  comentario?: string;
  respuestaArrendador?: string;
  fechaRespuesta?: string;
  visible: boolean;
  fechaCreacion: string;
}

interface PageResp<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
}

/** Moderación de reseñas de propiedad (panel admin, permiso MODERAR_RESENAS). */
export const adminResenaService = {
  listar: async (page = 0, size = 20): Promise<PageResp<ResenaModeracion>> => {
    const { data } = await api.get<PageResp<ResenaModeracion>>(
      `/resenas/admin/propiedad?page=${page}&size=${size}`,
    );
    return data;
  },

  /** Oculta (false) o restaura (true) una reseña. */
  cambiarVisibilidad: async (id: number, visible: boolean): Promise<void> => {
    await api.patch(`/resenas/propiedad/${id}/visibilidad`, { visible });
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/resenas/${id}?tipo=PROPIEDAD`);
  },

  /** Borra solo la respuesta del arrendador (la reseña queda). */
  eliminarRespuesta: async (id: number): Promise<void> => {
    await api.delete(`/resenas/propiedad/${id}/respuesta`);
  },
};
