import { api } from '@/lib/api';
import type { Page } from '@/types/pagination';

/**
 * Ítem 351: eventos de seguridad persistidos por `SecurityEventListener` (servicio-usuarios) a
 * partir del topic Kafka `user-security-events` (productor: `UserEventProducer`). Hoy el único
 * `tipo` emitido es `USER_INTENTOS_FALLIDOS` (bloqueo de cuenta por intentos de login fallidos).
 */
export interface SecurityEventAdmin {
  id: number;
  tipo: string;
  usuarioId: number | null;
  /** Payload del evento serializado a JSON (correo/telefono/ip enmascarados por el backend). */
  detalle: string | null;
  fecha: string;
}

export const adminSecurityService = {
  /** Página de eventos de seguridad, más reciente primero. `desde` en ISO 8601 (opcional). */
  listar: async (desde?: string, page = 0, size = 20): Promise<Page<SecurityEventAdmin>> => {
    const params: Record<string, string | number> = { page, size };
    if (desde) params.desde = desde;
    const res = await api.get<Page<SecurityEventAdmin>>('usuarios/admin/security-events', { params });
    return res.data;
  },
};
