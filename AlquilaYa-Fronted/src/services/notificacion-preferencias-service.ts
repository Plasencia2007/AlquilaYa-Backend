import { api } from '@/lib/api';

/**
 * Preferencias de notificación del usuario autenticado (ítem 210). Categorías reales del
 * catálogo TipoNotificacion de servicio-mensajeria: mensajes (chat), reservas (aprobación/
 * rechazo/pago/cancelación + recordatorios de pago) y marketing (alertas de zona/nuevas
 * propiedades — la única categoría "opt-in"/promocional que existe hoy). Notificaciones de
 * cuenta/seguridad (documentos, bienvenida, sistema) no son togglable y siempre se envían.
 */
export interface PreferenciasNotificacion {
  notificarMensajes: boolean;
  notificarReservas: boolean;
  notificarMarketing: boolean;
}

export const notificacionPreferenciasService = {
  obtener: async (): Promise<PreferenciasNotificacion> => {
    const { data } = await api.get<PreferenciasNotificacion>('/usuarios/perfil/preferencias-notificacion');
    return data;
  },

  actualizar: async (data: PreferenciasNotificacion): Promise<PreferenciasNotificacion> => {
    const { data: actualizado } = await api.put<PreferenciasNotificacion>(
      '/usuarios/perfil/preferencias-notificacion',
      data,
    );
    return actualizado;
  },
};
