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
  | 'SISTEMA'
  /** Ítem 378 (admin): un usuario subió un documento KYC nuevo, pendiente de revisión. */
  | 'DOCUMENTO_NUEVO'
  /** Notif admin (gap #2/3): una denuncia nueva sobre una propiedad, pendiente de revisión. */
  | 'DENUNCIA_NUEVA'
  /** Notif admin (gap #2/3): una propiedad nueva (o reenviada tras rechazo) quedó PENDIENTE de revisión. */
  | 'PROPIEDAD_PENDIENTE';

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
