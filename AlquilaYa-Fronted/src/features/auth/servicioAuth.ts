import Cookies from 'js-cookie';
import { Usuario } from '@/types/auth';
import { api } from '@/utils/api';

const NOMBRE_COOKIE_AUTH = 'auth-token';

export const servicioAuth = {
  iniciarSesion: async (correo: string, contrasena: string): Promise<Usuario | null> => {
    try {
      const response = await api.post('usuarios/auth/login', {
        correo,
        password: contrasena
      });

      const { token, id, ...usuarioRest } = response.data;
      
      // Guardar el token en la cookie
      Cookies.set(NOMBRE_COOKIE_AUTH, token, { expires: 1 }); // 1 día
      
      return {
        ...usuarioRest,
        id: id?.toString()
      } as Usuario;
    } catch (error) {
      console.error('Error en inicio de sesión:', error);
      return null;
    }
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
      
      // Guardar el token en la cookie
      Cookies.set(NOMBRE_COOKIE_AUTH, token, { expires: 1 }); // 1 día
      
      return {
        ...usuarioRest,
        id: id?.toString()
      } as Usuario;
    } catch (error) {
      console.error('Error en registro:', error);
      return null;
    }
  },

  cerrarSesion: () => {
    Cookies.remove(NOMBRE_COOKIE_AUTH);
  },

  obtenerUsuarioActualDesdeToken: (token: string): Usuario | null => {
    try {
      const partes = token.split('.');
      if (partes.length !== 3) return null;
      // El payload es la segunda parte (índice 1)
      const payload = JSON.parse(atob(partes[1]));
      return {
        id: payload.userId?.toString(),
        perfilId: payload.perfilId,
        correo: payload.sub,
        nombre: payload.nombre,
        rol: payload.rol
      };
    } catch (error) {
      return null;
    }
  }
};
