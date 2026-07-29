import { api } from '@/lib/api';

/**
 * Estadísticas agregadas de la plataforma (#86). Cifras REALES que servicio-propiedades
 * conoce en su propia BD; el conteo de estudiantes vive en otro servicio y NO se incluye.
 * `calificacionPromedio` es null cuando aún no hay ninguna reseña.
 */
export interface PlataformaStats {
  propiedadesActivas: number;
  reservasCompletadas: number;
  totalResenas: number;
  calificacionPromedio: number | null;
}

export const statsService = {
  /** GET /propiedades/stats — público. */
  getPlataforma: async (): Promise<PlataformaStats> => {
    const { data } = await api.get<PlataformaStats>('/propiedades/stats');
    return data;
  },
};
