import Cookies from 'js-cookie';
import { Usuario } from '@/types/auth';
import { api } from '@/utils/api';

const NOMBRE_COOKIE_AUTH = 'auth-token';

export const servicioAuth = {
  iniciarSesion: async (correo: string, contrasena: string): Promise<Usuario | null> => {
    try {
      const response = await api.post('/usuarios/auth/login', {
        correo,
        password: contrasena
      });

      const { token, ...usuario } = response.data;
      
      // Guardar el token en la cookie
      Cookies.set(NOMBRE_COOKIE_AUTH, token, { expires: 1 }); // 1 día
      
      return usuario as Usuario;
    } catch (error) {
      console.error('Error en inicio de sesión:', error);
      return null;
    }
  },

  registrarse: async (nombre: string, correo: string, contrasena: string, rol: string): Promise<Usuario | null> => {
    try {
      const response = await api.post('/usuarios/auth/register', {
        nombre,
        correo,
        password: contrasena,
        rol: rol.toUpperCase()
      });

      const { token, ...usuario } = response.data;
      
      // Guardar el token en la cookie
      Cookies.set(NOMBRE_COOKIE_AUTH, token, { expires: 1 }); // 1 día
      
      return usuario as Usuario;
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
        id: payload.sub,
        correo: payload.sub, // En el backend puse el correo como subject
        nombre: payload.nombre,
        rol: payload.rol
      };
    } catch (error) {
      return null;
    }
  }
};
