import { api } from '@/lib/api';

export interface ConfiguracionReserva {
  /** Horas que una reserva APROBADA espera el pago antes de EXPIRAR. */
  expiracionHoras: number;
}

/**
 * Configuración editable de reglas de negocio (panel admin).
 * Endpoints en servicio-propiedades bajo /admin/propiedades/configuracion.
 */
export const adminSettingsService = {
  obtenerConfiguracionReserva: async (): Promise<ConfiguracionReserva> => {
    const { data } = await api.get<ConfiguracionReserva>(
      'admin/propiedades/configuracion/reserva',
    );
    return data;
  },

  actualizarConfiguracionReserva: async (
    expiracionHoras: number,
  ): Promise<ConfiguracionReserva> => {
    const { data } = await api.put<ConfiguracionReserva>(
      'admin/propiedades/configuracion/reserva',
      { expiracionHoras },
    );
    return data;
  },
};
