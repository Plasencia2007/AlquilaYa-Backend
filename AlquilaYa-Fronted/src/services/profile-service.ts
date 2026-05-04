import Cookies from 'js-cookie';

import { api } from '@/lib/api';
import { servicioAuth } from '@/services/auth-service';
import type { ActualizarPerfilRequest, EstadoUsuario, Perfil } from '@/types/profile';

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
  estado?: EstadoUsuario;
  fotoUrl?: string;
  arrendador?: {
    id: number;
    nombreComercial?: string;
    ruc?: string;
    telefono?: string;
    direccionPropiedades?: string;
    latitud?: number;
    longitud?: number;
    esEmpresa?: boolean;
    calificacion?: number;
  } | null;
  estudiante?: {
    id: number;
    universidad?: string;
    codigoEstudiante?: string;
    carrera?: string;
    ciclo?: number;
    verificado?: boolean;
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
    estado: u.estado,
    fotoUrl: u.fotoUrl,
    detallesArrendador: u.arrendador
      ? {
          nombreComercial: u.arrendador.nombreComercial,
          ruc: u.arrendador.ruc,
          telefono: u.arrendador.telefono,
          direccionPropiedades: u.arrendador.direccionPropiedades,
          latitud: u.arrendador.latitud,
          longitud: u.arrendador.longitud,
          esEmpresa: u.arrendador.esEmpresa,
          calificacion: u.arrendador.calificacion,
        }
      : undefined,
    detallesEstudiante: u.estudiante
      ? {
          universidad: u.estudiante.universidad,
          codigoEstudiante: u.estudiante.codigoEstudiante,
          carrera: u.estudiante.carrera,
          ciclo: u.estudiante.ciclo,
          verificado: u.estudiante.verificado,
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
    const { data } = await api.put<UsuarioBackend>(`/usuarios/${userId}`, cambios);
    return fromBackend(data);
  },

  cambiarPassword: async (actual: string, nueva: string): Promise<void> => {
    const userId = obtenerMiUserId();
    if (!userId) throw new Error('No hay sesión activa');
    await api.post(`/usuarios/${userId}/cambiar-password`, {
      passwordActual: actual,
      nuevaPassword: nueva,
    });
  },

  subirFotoPerfil: async (file: File): Promise<string> => {
    const userId = obtenerMiUserId();
    if (!userId) throw new Error('No hay sesión activa');
    const formData = new FormData();
    formData.append('archivo', file);
    const { data } = await api.post<{ fotoUrl: string }>(
      `/usuarios/${userId}/foto`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.fotoUrl;
  },
};
