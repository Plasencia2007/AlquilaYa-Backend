import Cookies from 'js-cookie';
import { Usuario, PayloadJWT } from '@/types/auth';
import { encodeJWT } from '@/utils/jwt';
import { MOCK_USUARIOS } from '@/mocks/usuarios';

const NOMBRE_COOKIE_AUTH = 'auth-token';

export const servicioAuth = {
  iniciarSesion: async (correo: string, contrasena: string): Promise<Usuario | null> => {
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 800));

    const usuarioEncontrado = MOCK_USUARIOS.find(
      u => u.correo === correo && u.contrasena === contrasena
    );

    if (usuarioEncontrado) {
      const payload: PayloadJWT = {
        sub: usuarioEncontrado.id,
        correo: usuarioEncontrado.correo,
        nombre: usuarioEncontrado.nombre,
        rol: usuarioEncontrado.rol,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 horas
      };

      const token = encodeJWT(payload);
      Cookies.set(NOMBRE_COOKIE_AUTH, token, { expires: 1 }); // 1 día

      // El tipo Usuario no incluye la contraseña
      const { contrasena: _, ...usuarioSinContrasena } = usuarioEncontrado;
      return usuarioSinContrasena;
    }

    return null;
  },

  cerrarSesion: () => {
    Cookies.remove(NOMBRE_COOKIE_AUTH);
  },

  obtenerUsuarioActualDesdeToken: (token: string): Usuario | null => {
    try {
      const partes = token.split('.');
      if (partes.length !== 3) return null;
      const payload: PayloadJWT = JSON.parse(atob(partes[1]));
      return {
        id: payload.sub,
        correo: payload.correo,
        nombre: payload.nombre,
        rol: payload.rol
      };
    } catch (error) {
      return null;
    }
  }
};
