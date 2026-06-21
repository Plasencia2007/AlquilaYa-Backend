import { api } from '@/lib/api';
import type {
  CambioPasswordData,
  DatosAcademicosData,
  DatosPersonalesData,
} from '@/schemas/student-profile-schema';

export interface EstudianteInfo {
  id: number;
  usuarioId: number;
  nombre?: string;
  apellido?: string;
  correo?: string;
  telefono?: string;
  universidad?: string;
  carrera?: string;
  verificado?: boolean;
}

/**
 * Wrapper sobre los endpoints de actualización de perfil del estudiante en
 * servicio-usuarios. Si los endpoints aún no existen, devolvemos error que el
 * caller maneja con notify.error — la funcionalidad de UI queda lista para
 * cuando estén operativos.
 */
export const studentProfileService = {
  /** Info académica del estudiante (incluye universidad y carrera). */
  obtenerInfo: async (perfilId: number): Promise<EstudianteInfo> => {
    const { data } = await api.get<EstudianteInfo>(`/usuarios/estudiante/${perfilId}/info`);
    return data;
  },

  actualizarPersonal: async (data: DatosPersonalesData): Promise<void> => {
    await api.patch('/usuarios/perfil/personal', data);
  },

  actualizarAcademico: async (data: DatosAcademicosData): Promise<void> => {
    await api.patch('/usuarios/perfil/academico', data);
  },

  cambiarPassword: async (data: CambioPasswordData): Promise<void> => {
    await api.patch('/usuarios/perfil/password', {
      actual: data.actual,
      nueva: data.nueva,
    });
  },
};
