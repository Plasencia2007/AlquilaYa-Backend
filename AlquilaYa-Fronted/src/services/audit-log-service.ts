import { api } from '@/lib/api';
import type { Page } from '@/types/pagination';

/**
 * Fila de la bitácora de auditoría append-only (G8-A, backend `AuditLog`/`AuditLogController`).
 * Ítems 364/365: consumida por el tab "Historial" de validations/providers (filtrado
 * client-side a acciones de arrendadores) y por system/audit (tabla general sin filtrar).
 */
export interface AuditLogEntry {
  id: number;
  actorUsuarioId: number | null;
  actorCorreo: string | null;
  accion: string;
  entidad: string;
  entidadId: number | null;
  detalle: string | null;
  ip: string | null;
  /** ISO-8601 (LocalDateTime del backend, sin zona). */
  fecha: string;
}

export interface BuscarAuditLogParams {
  /** Subcadena del correo del actor (case-insensitive). */
  actor?: string;
  /** Acción exacta, p.ej. "CAMBIO_ESTADO_USUARIO". Vacío/omitido = todas. */
  accion?: string;
  /** ISO-8601 datetime. */
  desde?: string;
  hasta?: string;
  page?: number;
  size?: number;
}

const BASE = 'usuarios/audit';

export const auditLogService = {
  buscar: async (params: BuscarAuditLogParams = {}): Promise<Page<AuditLogEntry>> => {
    const { page = 0, size = 20, actor, accion, desde, hasta } = params;
    const query: Record<string, string | number> = { page, size };
    if (actor) query.actor = actor;
    if (accion) query.accion = accion;
    if (desde) query.desde = desde;
    if (hasta) query.hasta = hasta;
    const { data } = await api.get<Page<AuditLogEntry>>(BASE, { params: query });
    return data;
  },
};
