import { api } from '@/lib/api';

export type EstadoDenuncia = 'PENDIENTE' | 'REVISADA' | 'DESCARTADA';

export interface DenunciaAdmin {
  id: number;
  propiedadId: number;
  propiedadTitulo: string;
  motivo: string;
  descripcion?: string;
  estado: EstadoDenuncia;
  fechaCreacion: string;
}

/** Página de Spring Data (subconjunto de campos que usamos). */
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const adminDenunciaService = {
  listar: async (
    estado?: EstadoDenuncia,
    page = 0,
    size = 20,
  ): Promise<Pagina<DenunciaAdmin>> => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    if (estado) qs.set('estado', estado);
    const res = await api.get<Pagina<DenunciaAdmin>>(`admin/denuncias?${qs.toString()}`);
    return res.data;
  },

  actualizarEstado: async (id: number, estado: EstadoDenuncia): Promise<DenunciaAdmin> => {
    const res = await api.patch<DenunciaAdmin>(`admin/denuncias/${id}`, { estado });
    return res.data;
  },
};
