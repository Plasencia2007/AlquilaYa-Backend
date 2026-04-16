import { PayloadJWT } from '@/types/auth';

/**
 * Genera un JWT mock en Base64 (NO criptográfico)
 */
export const encodeJWT = (payload: PayloadJWT): string => {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa('mock-signature');
  return `${header}.${body}.${signature}`;
};

/**
 * Decodifica un JWT mock
 */
export const decodeJWT = (token: string): PayloadJWT | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const body = JSON.parse(atob(parts[1]));
    return body as PayloadJWT;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Verifica si un token ha expirado
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
};
