export type TipoNotificacion =
  | 'RESERVA_APROBADA'
  | 'RESERVA_RECHAZADA'
  | 'RESERVA_PAGADA'
  | 'RESERVA_CANCELADA'
  | 'MENSAJE_NUEVO'
  | 'DOCUMENTO_APROBADO'
  | 'DOCUMENTO_RECHAZADO'
  | 'BIENVENIDA'
  | 'RECORDATORIO_PAGO'
  | 'ALERTA_ZONA'
  | 'SISTEMA';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  datos?: Record<string, unknown>;
  urlDestino?: string | null;
  leida: boolean;
  fechaCreacion: string;
  fechaLectura?: string | null;
}
