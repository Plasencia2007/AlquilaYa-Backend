import { api } from '@/lib/api';
import type { Page } from '@/types/pagination';

/**
 * Fila de la DLQ (dead-letter queue) de alertas por correo que fallaron al
 * enviarse. El scheduler del backend las reintenta según `proximoIntento`;
 * desde aquí un admin puede forzar la reencolada. Endpoints (servicio-usuarios,
 * protegidos con `hasRole('ADMIN')`):
 *   - GET  /api/v1/usuarios/admin/alertas/fallidas?page=&size=
 *   - POST /api/v1/usuarios/admin/alertas/fallidas/{id}/reintentar
 */
export interface EnvioAlertaFallida {
  id: number;
  correo: string;
  propiedadId: number;
  suscripcionId: number;
  titulo: string;
  estado: 'FALLIDO';
  intentos: number;
  ultimoError?: string | null;
  proximoIntento?: string | null;
  createdAt: string;
  enviadoAt?: string | null;
}

/**
 * Respuesta 200 de `reintentar`. En la práctica `reencolada` siempre es `true`
 * cuando el backend responde 200 (la fila estaba en FALLIDO y se repuso). Si la
 * fila ya no estaba en FALLIDO el backend responde 409, y si el id no existe 404
 * — ambos casos caen por el catch de axios y los maneja `notify.error`.
 */
export interface ReintentoResponse {
  reencolada: boolean;
  mensaje: string;
}

export const adminAlertaService = {
  /** Lista paginada de alertas por correo fallidas (DLQ). */
  listarFallidas: async (page = 0, size = 20): Promise<Page<EnvioAlertaFallida>> => {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    const res = await api.get<Page<EnvioAlertaFallida>>(`usuarios/admin/alertas/fallidas?${qs.toString()}`);
    return res.data;
  },

  /** Repone la fila a PENDIENTE para que el scheduler la reintente. Idempotente. */
  reintentar: async (id: number): Promise<ReintentoResponse> => {
    const res = await api.post<ReintentoResponse>(`usuarios/admin/alertas/fallidas/${id}/reintentar`);
    return res.data;
  },
};
