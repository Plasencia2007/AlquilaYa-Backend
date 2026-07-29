import { api } from '@/lib/api';

export type TipoItemCatalogo =
  | 'SERVICIO'
  | 'REGLA'
  | 'TIPO_CUARTO'
  | 'PERIODO_ALQUILER'
  | 'MOTIVO_CANCELACION'
  | 'MOTIVO_RECHAZO'
  | 'BANNER';

export interface ItemCatalogo {
  id: number;
  nombre: string;
  valor: string;
  tipo: TipoItemCatalogo;
  icono?: string | null;
  descripcion?: string | null;
  /** Solo aplica a `BANNER`: URL de la imagen del hero gestionable. */
  imagenUrl?: string | null;
  activo: boolean;
}

export interface ItemCatalogoInput {
  nombre: string;
  valor: string;
  tipo: TipoItemCatalogo;
  icono?: string;
  descripcion?: string;
  /** Solo aplica a `BANNER`: URL de la imagen del hero gestionable. */
  imagenUrl?: string;
  activo: boolean;
}

export const catalogService = {
  listarFiltros: async (): Promise<ItemCatalogo[]> => {
    const response = await api.get<ItemCatalogo[]>('catalogos/admin/filtros');
    return response.data;
  },

  crearFiltro: async (input: ItemCatalogoInput): Promise<ItemCatalogo> => {
    const response = await api.post<ItemCatalogo>('catalogos/admin/filtros', input);
    return response.data;
  },

  actualizarFiltro: async (
    id: number,
    input: ItemCatalogoInput
  ): Promise<ItemCatalogo> => {
    const response = await api.put<ItemCatalogo>(
      `catalogos/admin/filtros/${id}`,
      input
    );
    return response.data;
  },

  eliminarFiltro: async (id: number): Promise<void> => {
    await api.delete(`catalogos/admin/filtros/${id}`);
  },

  /**
   * Sube un archivo de imagen para el banner del hero. El backend lo sube a
   * Cloudinary (carpeta `alquilaya/banners`) y devuelve la URL segura, que se
   * guarda como `imagenUrl` del ítem BANNER.
   */
  subirImagenBanner: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ url: string }>(
      'catalogos/admin/banners/imagen',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.url;
  },
};
