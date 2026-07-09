import { Usuario } from '@/types/auth';
import { api } from '@/lib/api';

// S5: TANTO el access token como el refresh token viven en cookies httpOnly que pone el
// BACKEND (Set-Cookie) — este frontend nunca los lee ni los escribe directamente (JS no
// puede: por eso resisten XSS). El navegador los manda solo gracias a `withCredentials`
// (access token en cada llamada a la API, vía el gateway que lo traduce a Authorization;
// refresh token sólo en las llamadas de auth). El backend ya NO devuelve ningún token en
// el body — sólo los datos del usuario + `autenticado` (reemplaza al viejo check "¿hay
// token?" para saber si la sesión quedó establecida).

/** Sesión/dispositivo activo (#10). */
export interface SesionDispositivo {
  jti: string;
  dispositivo: string;
  ip: string;
  creado: number | null; // epoch ms
  actual: boolean;
}

export interface AuthResponseBody {
  autenticado: boolean;
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  perfilId?: number | null;
  foto?: string | null;
  emailVerificado?: boolean;
  tipoLogin?: 'LOCAL' | 'GOOGLE';
}

function usuarioDesdeRespuesta(body: AuthResponseBody): Usuario {
  return {
    id: body.id?.toString(),
    nombre: body.nombre,
    correo: body.correo,
    rol: body.rol as Usuario['rol'],
    perfilId: body.perfilId ?? undefined,
    avatar: body.foto ?? undefined,
    emailVerificado: body.emailVerificado,
    tipoLogin: body.tipoLogin,
  };
}

export const servicioAuth = {
  iniciarSesion: async (correo: string, contrasena: string): Promise<Usuario | null> => {
    const response = await api.post<AuthResponseBody>('usuarios/auth/login', {
      correo,
      password: contrasena,
    });
    // El backend ya dejó las cookies httpOnly puestas (Set-Cookie) — nada que guardar acá.
    return usuarioDesdeRespuesta(response.data);
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

      const response = await api.post<AuthResponseBody>('usuarios/auth/register', body);

      // U1: si el método de verificación exige algo (WHATSAPP_OTP/EMAIL/AMBOS — el caso
      // normal), `autenticado` viene false y el backend NO puso cookies todavía; la sesión
      // se activa recién al verificar (otp-step/email-code-step llaman a completarActivacion
      // con la respuesta de verify-otp/verify-email, que si trae autenticado=true).
      return usuarioDesdeRespuesta(response.data);
    } catch (error) {
      // Re-lanzamos para que useAuthStore (y el modal) puedan mostrar el mensaje real.
      console.error('Error en registro:', error);
      throw error;
    }
  },

  // Llamar solo después de que el OTP/email sea verificado exitosamente, pasando la
  // respuesta completa de verificarOtp/verificarCodigoEmail. Si `autenticado` es true, el
  // backend ya puso las cookies httpOnly — acá sólo construimos el Usuario para hidratar
  // el store. Si es false (AMBOS y aún falta el otro factor), no hay sesión todavía.
  completarActivacion: (body?: AuthResponseBody): Usuario | null => {
    if (!body || !body.autenticado) return null;
    return usuarioDesdeRespuesta(body);
  },

  // G7 + S5: revoca la sesión en el backend (best-effort, no bloquea el logout local si
  // falla) — el navegador manda los cookies httpOnly solos (withCredentials), el backend
  // los revoca y los borra (Set-Cookie con Max-Age=0).
  cerrarSesion: () => {
    api.post('usuarios/auth/logout').catch(() => {
      // Best-effort: si el backend no responde, igual cerramos la sesión localmente.
    });
  },

  /**
   * S5: restaura la sesión al cargar la app. Como el access token es httpOnly (JS no puede
   * leerlo para saber "¿sigo logueado?"), se apoya en el refresh token (también httpOnly,
   * pero el navegador lo manda solo) llamando a /auth/refresh. Si hay sesión válida, el
   * backend renueva las cookies y devuelve los datos del usuario; si no, 401 = no hay sesión.
   */
  restaurarSesion: async (): Promise<Usuario | null> => {
    try {
      const response = await api.post<AuthResponseBody>('usuarios/auth/refresh');
      if (!response.data.autenticado) return null;
      return usuarioDesdeRespuesta(response.data);
    } catch {
      return null;
    }
  },

  loginConGoogle: async (idToken: string, rolPreferido: string = 'ESTUDIANTE'): Promise<Usuario | null> => {
    const response = await api.post<AuthResponseBody>('usuarios/auth/google-login', {
      idToken,
      rolPreferido,
    });
    return usuarioDesdeRespuesta(response.data);
  },

  solicitarResetPassword: async (correo: string): Promise<string> => {
    const response = await api.post('usuarios/auth/forgot-password', { correo });
    return response.data.mensaje;
  },

  resetearPassword: async (token: string, nuevaPassword: string): Promise<string> => {
    const response = await api.post('usuarios/auth/reset-password', { token, nuevaPassword });
    return response.data.mensaje;
  },

  /** Verifica el correo con el código de 6 dígitos recibido por email.
   *  U1: si ya no falta ninguna verificación, el backend deja la sesión activa (cookies +
   *  autenticado=true). S5: ningún token viaja en este body. */
  verificarCodigoEmail: async (correo: string, codigo: string): Promise<AuthResponseBody> => {
    const response = await api.post<AuthResponseBody>('usuarios/auth/verify-email', { correo, codigo });
    return response.data;
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

  verificarOtp: async (telefono: string, codigo: string): Promise<AuthResponseBody> => {
    const response = await api.post<AuthResponseBody>('usuarios/auth/verify-otp', { telefono, codigo });
    return response.data;
  },

  reenviarOtp: async (telefono: string): Promise<any> => {
    const response = await api.post('usuarios/auth/resend-otp', { telefono });
    return response.data;
  },
};
