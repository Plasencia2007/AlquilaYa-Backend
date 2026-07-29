import { api } from '@/lib/api';
import type {
  CambioPasswordData,
  DatosAcademicosData,
  DatosPersonalesData,
} from '@/schemas/student-profile-schema';
import type { NivelReputacion } from '@/types/reputacion';

export interface EstudianteInfo {
  id: number;
  usuarioId: number;
  nombre?: string;
  apellido?: string;
  correo?: string;
  telefono?: string;
  fotoUrl?: string;
  fechaNacimiento?: string;
  universidad?: string;
  /** Ítem 226: id del catálogo de universidades (servicio-catalogos), si se guardó desde el Combobox. */
  universidadId?: number;
  codigoEstudiante?: string;
  carrera?: string;
  ciclo?: number;
  verificado?: boolean;
  /** Score de reputación 0-100 (#26), calculado por servicio-usuarios. */
  score?: number;
  nivelReputacion?: NivelReputacion;
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
    // fechaNacimiento vacía debe ir como null (Jackson no parsea "" a LocalDate).
    await api.patch('/usuarios/perfil/personal', {
      ...data,
      fechaNacimiento: data.fechaNacimiento || null,
    });
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
