import { PayloadJWT } from '@/types/auth';

/** Decodifica el payload de un JWT emitido por el backend (solo client-side). */
export const decodeJWT = (token: string): PayloadJWT | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1])) as PayloadJWT;
  } catch {
    return null;
  }
};

/** Devuelve true si el token está expirado o es inválido. */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload) return true;
  return payload.exp < Math.floor(Date.now() / 1000);
};
