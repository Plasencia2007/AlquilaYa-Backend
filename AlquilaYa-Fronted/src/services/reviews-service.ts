import { api } from '@/lib/api';
import type { Resena } from '@/types/review';

export const reviewsService = {
  listarResenasArrendador: async (arrendadorId: number | string): Promise<Resena[]> => {
    const { data } = await api.get<Resena[]>(`/resenas/arrendador/${arrendadorId}`);
    return data;
  },

  crearResenaEstudiante: async (
    estudianteId: number | string,
    rating: number,
    comentario: string,
  ): Promise<void> => {
    await api.post('/resenas/estudiante', {
      estudianteId: Number(estudianteId),
      rating,
      comentario,
    });
  },
};
