/**
 * Recuerda con qué método entró el usuario la última vez (ítem 183), para mostrar un
 * chip tipo "La última vez entraste con Google" y evitar que alguien que solo tiene
 * cuenta de Google intente loguearse con una contraseña que nunca creó.
 */
export type LoginMethod = 'EMAIL' | 'GOOGLE';

const KEY = 'alquilaya-last-login-method';

export function getLastLoginMethod(): LoginMethod | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'EMAIL' || v === 'GOOGLE' ? v : null;
  } catch {
    return null;
  }
}

export function setLastLoginMethod(method: LoginMethod): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, method);
  } catch {
    /* localStorage no disponible → best-effort */
  }
}
