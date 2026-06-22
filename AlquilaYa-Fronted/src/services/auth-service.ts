import Cookies from 'js-cookie';
import { Usuario } from '@/types/auth';
import { api } from '@/lib/api';

const NOMBRE_COOKIE_AUTH = 'auth-token';

/** Sesión/dispositivo activo (#10). */
export interface SesionDispositivo {
  jti: string;
  dispositivo: string;
  ip: string;
  creado: number | null; // epoch ms
  actual: boolean;
}

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
        rol: payload.rol,
        emailVerificado: payload.emailVerificado
      };
    } catch {
      return null;
    }
  },

  loginConGoogle: async (idToken: string, rolPreferido: string = 'ESTUDIANTE'): Promise<Usuario | null> => {
    const response = await api.post('usuarios/auth/google-login', {
      idToken,
      rolPreferido,
    });

    const { token, id, ...usuarioRest } = response.data;
    Cookies.set(NOMBRE_COOKIE_AUTH, token, { expires: 1 });

    return { ...usuarioRest, id: id?.toString() } as Usuario;
  },

  solicitarResetPassword: async (correo: string): Promise<string> => {
    const response = await api.post('usuarios/auth/forgot-password', { correo });
    return response.data.mensaje;
  },

  resetearPassword: async (token: string, nuevaPassword: string): Promise<string> => {
    const response = await api.post('usuarios/auth/reset-password', { token, nuevaPassword });
    return response.data.mensaje;
  },

  /** Verifica el correo con el código de 6 dígitos recibido por email. */
  verificarCodigoEmail: async (correo: string, codigo: string): Promise<string> => {
    const response = await api.post('usuarios/auth/verify-email', { correo, codigo });
    return response.data.mensaje;
  },

  /** Sesiones/dispositivos activos del usuario (#10). */
  obtenerSesiones: async (): Promise<SesionDispositivo[]> => {
    const response = await api.get<SesionDispositivo[]>('usuarios/auth/sesiones');
    return response.data;
  },

  /** Cierra una sesión en remoto por su id (jti). */
  cerrarSesionRemota: async (jti: string): Promise<void> => {
    await api.delete(`usuarios/auth/sesiones/${jti}`);
  },

  /** Cierra todas las sesiones excepto la actual. */
  cerrarOtrasSesiones: async (): Promise<number> => {
    const response = await api.post<{ cerradas: number }>('usuarios/auth/sesiones/cerrar-otras');
    return response.data.cerradas;
  },

  /** Método de verificación vigente (público), para adaptar el flujo de registro. */
  obtenerMetodoVerificacion: async (): Promise<'EMAIL' | 'WHATSAPP_OTP' | 'AMBOS' | 'NINGUNO'> => {
    const response = await api.get<{ metodo: 'EMAIL' | 'WHATSAPP_OTP' | 'AMBOS' | 'NINGUNO' }>(
      'usuarios/auth/configuracion/verificacion',
    );
    return response.data.metodo;
  },

  reenviarVerificacionEmail: async (correo: string): Promise<string> => {
    const response = await api.post('usuarios/auth/resend-email-verification', { correo });
    return response.data.mensaje;
  },

  verificarOtp: async (telefono: string, codigo: string): Promise<any> => {
    const response = await api.post('usuarios/auth/verify-otp', { telefono, codigo });
    return response.data;
  },

  reenviarOtp: async (telefono: string): Promise<any> => {
    const response = await api.post('usuarios/auth/resend-otp', { telefono });
    return response.data;
  },
};


