import Cookies from 'js-cookie';

import { api } from '@/lib/api';
import { servicioAuth } from '@/services/auth-service';
import type { ActualizarPerfilRequest, Perfil } from '@/types/profile';

/**
 * Obtiene el `userId` del JWT en cookie. Lo necesitamos para las rutas
 * `/usuarios/{id}` que el backend expone (no hay un endpoint "me" propio).
 */
function obtenerMiUserId(): number | null {
  const token = Cookies.get('auth-token');
  if (!token) return null;
  const u = servicioAuth.obtenerUsuarioActualDesdeToken(token);
  if (!u?.id) return null;
  const id = Number(u.id);
  return Number.isFinite(id) ? id : null;
}

interface UsuarioBackend {
  id: number;
  nombre: string;
  apellido: string;
  dni?: string;
  correo: string;
  telefono?: string;
  rol: 'ESTUDIANTE' | 'ARRENDADOR' | 'ADMIN';
  estado?: string;
  arrendador?: {
    id: number;
    nombreComercial?: string;
    calificacion?: number;
    telefono?: string;
  } | null;
  estudiante?: {
    id: number;
    universidad?: string;
    carrera?: string;
  } | null;
}

function fromBackend(u: UsuarioBackend): Perfil {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    dni: u.dni,
    correo: u.correo,
    telefono: u.telefono,
    rol: u.rol,
    detallesArrendador: u.arrendador
      ? {
          nombreComercial: u.arrendador.nombreComercial,
          calificacion: u.arrendador.calificacion,
        }
      : undefined,
    detallesEstudiante: u.estudiante
      ? {
          universidad: u.estudiante.universidad,
          carrera: u.estudiante.carrera,
        }
      : undefined,
  };
}

export const profileService = {
  obtenerMiPerfil: async (): Promise<Perfil> => {
    const userId = obtenerMiUserId();
    if (!userId) throw new Error('No hay sesión activa');
    const { data } = await api.get<UsuarioBackend>(`/usuarios/${userId}`);
    return fromBackend(data);
  },

  actualizarPerfil: async (cambios: ActualizarPerfilRequest): Promise<Perfil> => {
    const userId = obtenerMiUserId();
    if (!userId) throw new Error('No hay sesión activa');
    const { data } = await api.put<UsuarioBackend>(`/usuarios/${userId}`, {
      nombre: cambios.nombre,
      apellido: cambios.apellido,
      telefono: cambios.telefono,
      // direccion / fotoUrl aún no son campos del backend pero los enviamos por si
      // se agregan; el backend ignora propiedades desconocidas.
      direccion: cambios.direccion,
      fotoUrl: cambios.fotoUrl,
    });
    return fromBackend(data);
  },

  /**
   * El backend (estado actual) no expone aún un endpoint dedicado para que un
   * usuario autenticado cambie su contraseña sin OTP. Se intenta primero el
   * endpoint canónico y, si responde 404, se cae al flujo de reset solicitando
   * un correo. Esta función queda como contrato estable para la UI.
   */
  cambiarPassword: async (actual: string, nueva: string): Promise<void> => {
    const userId = obtenerMiUserId();
    if (!userId) throw new Error('No hay sesión activa');
    await api.post(`/usuarios/${userId}/cambiar-password`, {
      passwordActual: actual,
      nuevaPassword: nueva,
    });
  },
};
