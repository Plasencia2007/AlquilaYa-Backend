import { api } from '@/lib/api';

/**
 * Ítem 229: autoservicio de 2FA (TOTP / RFC 6238) — activar/desactivar desde el perfil.
 * El paso que COMPLETA el login con el código (tras un password correcto en una cuenta con
 * 2FA activo) vive en `auth-service.ts` (`servicioAuth.verificarTotpLogin`), junto al resto
 * del flujo de login/sesión.
 */

export interface Generar2faResponse {
  /** Secret en claro (base32), solo para setup manual — se muestra una vez. */
  secret: string;
  /** URI otpauth://, se convierte en QR client-side (qrcode.react). */
  otpauthUri: string;
}

export const twoFactorService = {
  /** Estado actual de 2FA del usuario autenticado, para pintar el toggle al montar. */
  estado: async (): Promise<boolean> => {
    const { data } = await api.get<{ habilitado: boolean }>('/usuarios/auth/2fa/estado');
    return data.habilitado;
  },

  /** Genera un secret nuevo + URI para el QR. NO activa 2FA todavía. */
  generar: async (): Promise<Generar2faResponse> => {
    const { data } = await api.post<Generar2faResponse>('/usuarios/auth/2fa/generar');
    return data;
  },

  /** Confirma el setup con un código de 6 dígitos: recién aquí se activa 2FA. */
  confirmar: async (codigo: string): Promise<void> => {
    await api.post('/usuarios/auth/2fa/confirmar', { codigo });
  },

  /** Requiere password actual O un código TOTP vigente. */
  deshabilitar: async (params: { password?: string; codigo?: string }): Promise<void> => {
    await api.post('/usuarios/auth/2fa/deshabilitar', params);
  },
};
