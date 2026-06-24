import { api } from '@/lib/api';

export type EstadoGrupo = 'ABIERTO' | 'COMPLETO' | 'RESERVADO' | 'CERRADO';
export type EstadoMiembro = 'CREADOR' | 'UNIDO' | 'SOLICITADO';

export interface MiembroGrupo {
  estudianteId: number;
  estado: EstadoMiembro;
}

export interface GrupoRoommate {
  id: number;
  propiedadId: number;
  propiedadTitulo?: string;
  creadorEstudianteId: number;
  nombre?: string;
  descripcion?: string;
  cuposTotales: number;
  cuposOcupados: number;
  estado: EstadoGrupo;
  codigoInvitacion: string;
  miembros: MiembroGrupo[];
}

export interface CrearGrupoRequest {
  propiedadId: number | string;
  nombre?: string;
  descripcion?: string;
  cuposTotales?: number;
}

const BASE = '/grupos';

export const grupoService = {
  crear: async (req: CrearGrupoRequest): Promise<GrupoRoommate> => {
    const { data } = await api.post<GrupoRoommate>(BASE, req);
    return data;
  },
  obtener: async (id: number | string): Promise<GrupoRoommate> => {
    const { data } = await api.get<GrupoRoommate>(`${BASE}/${id}`);
    return data;
  },
  abiertosDePropiedad: async (propiedadId: number | string): Promise<GrupoRoommate[]> => {
    const { data } = await api.get<GrupoRoommate[]>(`${BASE}/propiedad/${propiedadId}/abiertos`);
    return data;
  },
  mios: async (): Promise<GrupoRoommate[]> => {
    const { data } = await api.get<GrupoRoommate[]>(`${BASE}/mios`);
    return data;
  },
  solicitar: async (id: number | string): Promise<GrupoRoommate> => {
    const { data } = await api.post<GrupoRoommate>(`${BASE}/${id}/solicitar`);
    return data;
  },
  unirse: async (codigo: string): Promise<GrupoRoommate> => {
    const { data } = await api.post<GrupoRoommate>(`${BASE}/unirse`, null, { params: { codigo } });
    return data;
  },
  aprobar: async (id: number | string, estudianteId: number): Promise<GrupoRoommate> => {
    const { data } = await api.post<GrupoRoommate>(`${BASE}/${id}/miembros/${estudianteId}/aprobar`);
    return data;
  },
  salir: async (id: number | string): Promise<GrupoRoommate> => {
    const { data } = await api.delete<GrupoRoommate>(`${BASE}/${id}/salir`);
    return data;
  },
  eliminar: async (id: number | string): Promise<void> => {
    await api.delete(`${BASE}/${id}`);
  },
};
