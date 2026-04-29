import { api } from '@/lib/api';
import type { CalificacionResumen, Resena } from '@/types/review';

/**
 * Reseñas que han recibido los arrendadores.
 * Endpoints backend (servicio-propiedades):
 *   - GET /api/v1/resenas/arrendador/{arrendadorId}
 *   - GET /api/v1/resenas/arrendador/{arrendadorId}/calificacion
 */
export const reviewsService = {
  listarResenasArrendador: async (arrendadorId: number | string): Promise<Resena[]> => {
    const { data } = await api.get<Resena[]>(`/resenas/arrendador/${arrendadorId}`);
    return data;
  },

  calificacionArrendador: async (
    arrendadorId: number | string,
  ): Promise<CalificacionResumen> => {
    const { data } = await api.get<{ promedio?: number; total?: number }>(
      `/resenas/arrendador/${arrendadorId}/calificacion`,
    );
    return {
      promedio: Number(data.promedio ?? 0),
      total: Number(data.total ?? 0),
    };
  },
};
