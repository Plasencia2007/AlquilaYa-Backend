import Cookies from 'js-cookie';
import { Usuario } from '@/types/auth';
import { api } from '@/utils/api';

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
      const response = await api.post('usuarios/auth/register', {
        nombre,
        apellido,
        dni,
        correo,
        password: contrasena,
        rol: rol.toUpperCase(),
        telefono,
        detallesPerfil
      });

      const { token, id, ...usuarioRest } = response.data;

      // Guardamos el token en memoria, NO en cookie.
      // El cookie solo se activa después de verificar el OTP.
      _pendingToken = token;

      return { ...usuarioRest, id: id?.toString() } as Usuario;
    } catch (error) {
      console.error('Error en registro:', error);
      return null;
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
