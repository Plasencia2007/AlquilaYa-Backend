import { api } from '@/lib/api';

export type TipoItemCatalogo =
  | 'SERVICIO'
  | 'REGLA'
  | 'TIPO_CUARTO'
  | 'PERIODO_ALQUILER';

export interface ItemCatalogo {
  id: number;
  nombre: string;
  valor: string;
  tipo: TipoItemCatalogo;
  icono?: string | null;
  activo: boolean;
}

export interface ItemCatalogoInput {
  nombre: string;
  valor: string;
  tipo: TipoItemCatalogo;
  icono?: string;
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
};
