import { api } from '@/lib/api';
import type { Page } from '@/types/pagination';

export type EstadoDenuncia = 'PENDIENTE' | 'REVISADA' | 'DESCARTADA';

export interface DenunciaAdmin {
  id: number;
  propiedadId: number;
  propiedadTitulo: string;
  motivo: string;
  descripcion?: string;
  estado: EstadoDenuncia;
  fechaCreacion: string;
  /** Total de denuncias (cualquier estado) sobre la MISMA propiedad — insumo de severidad (376). */
  propiedadTotalDenuncias?: number;
}

/** Conteo agregado por estado (ítem 376), siempre correcto sin depender del filtro activo. */
export interface DenunciaConteos {
  pendientes: number;
  revisadas: number;
  descartadas: number;
  total: number;
}

export const adminDenunciaService = {
  listar: async (
    estado?: EstadoDenuncia,
    page = 0,
    size = 20,
  ): Promise<Page<DenunciaAdmin>> => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    if (estado) qs.set('estado', estado);
    const res = await api.get<Page<DenunciaAdmin>>(`admin/denuncias?${qs.toString()}`);
    return res.data;
  },

  conteos: async (): Promise<DenunciaConteos> => {
    const res = await api.get<DenunciaConteos>('admin/denuncias/conteos');
    return res.data;
  },

  actualizarEstado: async (id: number, estado: EstadoDenuncia): Promise<DenunciaAdmin> => {
    const res = await api.patch<DenunciaAdmin>(`admin/denuncias/${id}`, { estado });
    return res.data;
  },
};
