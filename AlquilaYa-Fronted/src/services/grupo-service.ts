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
  /** Link del grupo de WhatsApp para coordinar (ítem 221), solo lo edita el creador. */
  linkWhatsapp?: string;
  /** Reserva grupal generada (Fase 2), si ya reservó. */
  reservaId?: number;
  miembros: MiembroGrupo[];
}

export interface CuotaPago {
  reservaId: number;
  grupoId: number;
  estudianteId: number;
  monto: number;
  estado: 'PENDIENTE' | 'PAGADO';
  propiedadTitulo?: string;
  estudianteNombre?: string;
  estudianteCorreo?: string;
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
  /** Solo el creador puede setear/editar el link del grupo de WhatsApp (ítem 221). */
  actualizarWhatsapp: async (id: number | string, linkWhatsapp: string): Promise<GrupoRoommate> => {
    const { data } = await api.patch<GrupoRoommate>(`${BASE}/${id}/whatsapp`, { linkWhatsapp });
    return data;
  },

  // ===== Fase 2: reserva grupal + pago dividido =====
  reservar: async (
    id: number | string,
    fechas: { fechaInicio: string; fechaFin: string },
  ): Promise<GrupoRoommate> => {
    const { data } = await api.post<GrupoRoommate>(`${BASE}/${id}/reservar`, fechas);
    return data;
  },
  cuotas: async (reservaId: number | string): Promise<CuotaPago[]> => {
    const { data } = await api.get<CuotaPago[]>(`${BASE}/reserva/${reservaId}/cuotas`);
    return data;
  },
  miCuota: async (reservaId: number | string): Promise<CuotaPago> => {
    const { data } = await api.get<CuotaPago>(`${BASE}/reserva/${reservaId}/mi-cuota`);
    return data;
  },
};
