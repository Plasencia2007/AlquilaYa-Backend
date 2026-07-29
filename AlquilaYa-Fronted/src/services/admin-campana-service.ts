import { api } from '@/lib/api';
import type { Page } from '@/types/pagination';

export type EstadoEnvioCampana = 'PENDIENTE' | 'ENVIADA' | 'ERROR';

export interface CampanaWhatsapp {
  id: number;
  carrera?: string | null;
  estado?: string | null;
  mensaje: string;
  programadoPara?: string | null;
  estadoEnvio: EstadoEnvioCampana;
  destinatarios?: number | null;
  ultimoError?: string | null;
  createdAt: string;
  enviadoAt?: string | null;
}

export interface CrearCampanaInput {
  carrera?: string;
  estado?: string;
  mensaje: string;
  /** ISO local datetime (`yyyy-MM-ddTHH:mm`); omitido = envío inmediato. */
  programadoPara?: string;
}

/**
 * Campañas de WhatsApp a estudiantes segmentados (ítem 381). El backend (servicio-usuarios)
 * resuelve el segmento (rol ESTUDIANTE + `notificarMarketing=true` + carrera/estado opcionales)
 * y encola un evento Kafka por destinatario que servicio-notificaciones envía.
 */
export const adminCampanaService = {
  /** Carreras con al menos un estudiante, para el <select> de segmento. */
  carreras: async (): Promise<string[]> => {
    const res = await api.get<string[]>('usuarios/admin/campanas/estudiantes/carreras');
    return Array.isArray(res.data) ? res.data : [];
  },

  /** Conteo estimado de destinatarios — preview ANTES de confirmar el envío. */
  contarDestinatarios: async (carrera?: string, estado?: string): Promise<number> => {
    const params: Record<string, string> = {};
    if (carrera) params.carrera = carrera;
    if (estado) params.estado = estado;
    const res = await api.get<{ total: number }>('usuarios/admin/campanas/estudiantes/conteo', { params });
    return res.data?.total ?? 0;
  },

  crear: async (input: CrearCampanaInput): Promise<CampanaWhatsapp> => {
    const res = await api.post<CampanaWhatsapp>('usuarios/admin/campanas/whatsapp', input);
    return res.data;
  },

  listar: async (page = 0, size = 10): Promise<Page<CampanaWhatsapp>> => {
    const res = await api.get<Page<CampanaWhatsapp>>('usuarios/admin/campanas/whatsapp', {
      params: { page, size },
    });
    return res.data;
  },
};
