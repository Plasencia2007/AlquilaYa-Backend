import { api } from '@/lib/api';
import type { Propiedad } from '@/types/propiedad';

interface ToggleResponse {
  favorito: boolean;
  mensaje?: string;
}

interface ExisteResponse {
  favorito: boolean;
}

/**
 * Wrapper sobre el endpoint `/api/v1/favoritos` del servicio-propiedades.
 * El backend usa `POST {id}` como toggle idempotente y devuelve el estado final.
 */
export const favoriteService = {
  listar: async (): Promise<Propiedad[]> => {
    const { data } = await api.get<Propiedad[]>('/favoritos');
    return data;
  },

  toggle: async (propiedadId: string): Promise<boolean> => {
    const { data } = await api.post<ToggleResponse>(`/favoritos/${propiedadId}`);
    return !!data.favorito;
  },

  existe: async (propiedadId: string): Promise<boolean> => {
    const { data } = await api.get<ExisteResponse>(`/favoritos/check/${propiedadId}`);
    return !!data.favorito;
  },
};
