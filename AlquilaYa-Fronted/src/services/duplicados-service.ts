import { api } from '@/lib/api';

/**
 * Ítem 385: marca un cluster de cuentas duplicadas (identificado por el mismo par
 * criterio/valor que arma `ClusterDuplicado`, ver admin-user-service.ts) como
 * "revisado — no es duplicado" para que deje de aparecer en la detección automática.
 * NO fusiona cuentas (fase 2, fuera de alcance).
 */
export const duplicadosService = {
  marcarRevisado: async (criterio: string, valor: string): Promise<void> => {
    await api.post('usuarios/admin/duplicados/revisar', { criterio, valor });
  },
};
