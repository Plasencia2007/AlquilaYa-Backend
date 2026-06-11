import { api } from '@/lib/api';
import { fromDTO, type PropiedadPublicoDTO } from '@/services/property-service';
import type { Propiedad } from '@/types/propiedad';

interface ToggleResponse {
  favorito: boolean;
  mensaje?: string;
}

interface ExisteResponse {
  favorito: boolean;
}

interface FavoritoDTO {
  id: number;
  estudianteId: number;
  fechaCreacion: string;
  propiedad: PropiedadPublicoDTO | null;
}

interface FavoritosPageDTO {
  content: FavoritoDTO[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
}

export interface FavoritoItem {
  propiedad: Propiedad;
  guardadoEn: string;
}

export interface FavoritosPagina {
  items: FavoritoItem[];
  hasNext: boolean;
  totalElements: number;
}

/**
 * Wrapper sobre el endpoint `/api/v1/favoritos` del servicio-propiedades.
 * El backend usa `POST {id}` como toggle idempotente y devuelve el estado final.
 */
export const favoriteService = {
  /** Solo IDs de propiedad (barato): hidrata el store de corazones al login. */
  listarIds: async (): Promise<string[]> => {
    const { data } = await api.get<number[]>('/favoritos/ids');
    return data.map(String);
  },

  /** Página enriquecida para la pantalla "Mis favoritos". */
  listarPagina: async (page: number, size = 12): Promise<FavoritosPagina> => {
    const { data } = await api.get<FavoritosPageDTO>('/favoritos/mis', {
      params: { page, size },
    });
    return {
      items: data.content
        .filter((f) => f.propiedad != null)
        .map((f) => ({
          propiedad: fromDTO(f.propiedad as PropiedadPublicoDTO),
          guardadoEn: f.fechaCreacion,
        })),
      hasNext: data.hasNext,
      totalElements: data.totalElements,
    };
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
