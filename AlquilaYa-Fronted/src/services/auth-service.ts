import Cookies from 'js-cookie';
import { Usuario } from '@/types/auth';
import { api } from '@/lib/api';

const NOMBRE_COOKIE_AUTH = 'auth-token';

// Token temporal durante el registro, antes de verificar OTP.
// No se guarda en cookie hasta que el OTP sea confirmado.
let _pendingToken: string | null = null;

export const servicioAuth = {
  iniciarSesion: async (correo: string, contrasena: string): Promise<Usuario | null> => {
    const response = await api.post('usuarios/auth/login', {
      correo,
      password: contrasena
    });

    const { token, id, ...usuarioRest } = response.data;
    Cookies.set(NOMBRE_COOKIE_AUTH, token, { expires: 1 });

    return { ...usuarioRest, id: id?.toString() } as Usuario;
  },

  registrarse: async (nombre: string, apellido: string, dni: string, correo: string, contrasena: string, rol: string, detallesPerfil: any, telefono: string): Promise<Usuario | null> => {
    try {
      const rolUpper = rol.toUpperCase();

      // El backend espera el campo de detalles con el nombre segun el rol:
      //   ESTUDIANTE  -> detallesEstudiante
      //   ARRENDADOR  -> detallesArrendador
      // El frontend maneja un solo 'detallesPerfil' y aqui lo mapeamos.
      const body: Record<string, any> = {
        nombre,
        apellido,
        dni,
        correo,
        password: contrasena,
        rol: rolUpper,
        telefono,
      };
      if (rolUpper === 'ESTUDIANTE') {
        body.detallesEstudiante = detallesPerfil;
      } else if (rolUpper === 'ARRENDADOR') {
        body.detallesArrendador = detallesPerfil;
      }

      const response = await api.post('usuarios/auth/register', body);

      const { token, id, ...usuarioRest } = response.data;

      // Guardamos el token en memoria, NO en cookie.
      // El cookie solo se activa después de verificar el OTP.
      _pendingToken = token;

      return { ...usuarioRest, id: id?.toString() } as Usuario;
    } catch (error) {
      // Re-lanzamos para que useAuthStore (y el modal) puedan mostrar el mensaje real.
      console.error('Error en registro:', error);
      throw error;
    }
  },

  // Llamar solo después de que el OTP sea verificado exitosamente.
  completarActivacion: (): Usuario | null => {
    if (!_pendingToken) return null;
    Cookies.set(NOMBRE_COOKIE_AUTH, _pendingToken, { expires: 1 });
    const usuario = servicioAuth.obtenerUsuarioActualDesdeToken(_pendingToken);
    _pendingToken = null;
    return usuario;
  },

  cerrarSesion: () => {
    _pendingToken = null;
    Cookies.remove(NOMBRE_COOKIE_AUTH);
  },

  obtenerUsuarioActualDesdeToken: (token: string): Usuario | null => {
    try {
      const partes = token.split('.');
      if (partes.length !== 3) return null;
      const payload = JSON.parse(atob(partes[1]));
      return {
        id: payload.userId?.toString(),
        perfilId: payload.perfilId,
        correo: payload.sub,
        nombre: payload.nombre,
        rol: payload.rol
      };
    } catch {
      return null;
    }
  }
};
