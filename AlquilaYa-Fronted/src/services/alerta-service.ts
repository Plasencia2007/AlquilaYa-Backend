import { api } from '@/lib/api';

/**
 * Suscripción a alertas por correo de nuevas propiedades (MEJORAS.md #99/#492).
 *
 * Endpoints públicos de servicio-usuarios (montados bajo `/usuarios/alertas` para reutilizar
 * la ruta del gateway). Todas las respuestas del backend son genéricas por diseño (no revelan
 * si un correo ya estaba suscrito ni si un token existe), así que aquí solo nos importa el
 * éxito HTTP.
 */

export interface CrearAlertaInput {
  correo: string;
  /** Al menos uno de zonaId / universidadId es obligatorio (lo valida el backend). */
  zonaId?: number;
  universidadId?: number;
  precioMax?: number;
  /** Nombre del enum TipoPropiedad (p.ej. 'CUARTO_INDIVIDUAL'). Opcional: no filtra si se omite. */
  tipoPropiedad?: string;
  /** Servicios que la propiedad debe ofrecer TODOS (subset). Opcional. */
  servicios?: string[];
  /** Dormitorios mínimos de la propiedad. Opcional. */
  dormitoriosMin?: number;
  /** Capacidad (personas) mínima de la propiedad. Opcional. */
  capacidadMin?: number;
}

export const alertaService = {
  /** Alta de suscripción (idempotente + double opt-in: dispara un correo de confirmación). */
  suscribir: async (input: CrearAlertaInput): Promise<void> => {
    await api.post('usuarios/alertas', input);
  },

  /** Confirma el alta (double opt-in) con el token del correo. */
  confirmar: async (token: string): Promise<void> => {
    await api.post(`usuarios/alertas/confirmar/${encodeURIComponent(token)}`);
  },

  /** Da de baja una suscripción con su token. */
  darDeBaja: async (token: string): Promise<void> => {
    await api.delete(`usuarios/alertas/baja/${encodeURIComponent(token)}`);
  },
};
