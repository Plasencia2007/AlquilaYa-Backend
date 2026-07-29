import { api } from '@/lib/api';
import type { Notificacion } from '@/types/notificacion';
import type { Page } from '@/types/pagination';

export const notificationService = {
  listar: async (page = 0, size = 20): Promise<Page<Notificacion>> => {
    const { data } = await api.get<Page<Notificacion>>('/notificaciones/mis', {
      params: { page, size },
    });
    return data;
  },

  contarNoLeidas: async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>('/notificaciones/no-leidas/count');
    return data.count ?? 0;
  },

  marcarLeida: async (id: number): Promise<boolean> => {
    const { data } = await api.patch<{ actualizada: boolean }>(`/notificaciones/${id}/leer`);
    return !!data.actualizada;
  },

  marcarTodasLeidas: async (): Promise<number> => {
    const { data } = await api.patch<{ actualizadas: number }>('/notificaciones/leer-todas');
    return data.actualizadas ?? 0;
  },
};
