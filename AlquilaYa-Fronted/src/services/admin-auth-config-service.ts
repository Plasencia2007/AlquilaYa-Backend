import { api } from '@/lib/api';

export type MetodoVerificacion = 'EMAIL' | 'WHATSAPP_OTP' | 'AMBOS' | 'NINGUNO';

export const adminAuthConfigService = {
  /** Método de verificación vigente (endpoint público). */
  obtener: async (): Promise<MetodoVerificacion> => {
    const res = await api.get<{ metodo: MetodoVerificacion }>(
      'usuarios/auth/configuracion/verificacion',
    );
    return res.data.metodo;
  },

  /** Cambia el método (solo admin). */
  actualizar: async (metodo: MetodoVerificacion): Promise<MetodoVerificacion> => {
    const res = await api.put<{ metodo: MetodoVerificacion }>(
      'usuarios/admin/configuracion/verificacion',
      { metodo },
    );
    return res.data.metodo;
  },
};
