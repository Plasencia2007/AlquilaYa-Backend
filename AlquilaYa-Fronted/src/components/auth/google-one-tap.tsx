'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleOneTapLogin } from '@react-oauth/google';

import { useAuth } from '@/hooks/use-auth';
import { setLastLoginMethod } from '@/lib/last-login-method';

/** Clave de sessionStorage: si el visitante cierra el prompt, no debe reaparecer en
 *  la misma sesión de navegador (evita ser intrusivo en cada visita al home). */
const DESCARTADO_KEY = 'alquilaya-one-tap-descartado';

function leerDescartado(): boolean {
  if (typeof window === 'undefined') return true; // SSR: sin sessionStorage, arranca deshabilitado hasta hidratar
  try {
    return window.sessionStorage.getItem(DESCARTADO_KEY) === '1';
  } catch {
    return false;
  }
}

function marcarDescartado(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DESCARTADO_KEY, '1');
  } catch {
    /* sessionStorage no disponible → best-effort, el prompt podría reaparecer */
  }
}

/**
 * Google One Tap (ítem 182 del roadmap): el prompt flotante que Google inyecta solo
 * en la esquina de la pantalla para loguearse con un click, sin abrir el modal de
 * login. Es un flujo ADICIONAL al botón de Google que ya vive en `login-form.tsx`
 * (mismo `loginConGoogle`, mismo rol por defecto) — no lo reemplaza ni lo duplica,
 * solo ofrece una segunda vía de entrada para visitantes no autenticados en el home.
 *
 * No renderiza nada propio: el SDK de Google dibuja su UI flotante fuera del árbol
 * de React. `GoogleAuthProvider` (en el layout raíz) ya provee el `clientId`.
 */
export function GoogleOneTap() {
  const { estaAutenticado, cargando, loginConGoogle } = useAuth();
  const router = useRouter();

  // Lazy initializer (no useEffect + setState): lee sessionStorage una sola vez, antes
  // del primer render, para decidir si el hook de Google debe arrancar deshabilitado.
  const [descartado, setDescartado] = useState(leerDescartado);

  const redirigirPorRol = useCallback(
    (rol: string) => {
      switch (rol) {
        case 'ADMIN':
          router.push('/admin-master');
          break;
        case 'ARRENDADOR':
          router.push('/landlord/dashboard');
          break;
        default:
          router.push('/');
      }
    },
    [router],
  );

  useGoogleOneTapLogin({
    // Mientras `cargando` no resuelva si hay sesión previa, mantenemos el prompt
    // apagado: mostrarlo un instante a alguien ya autenticado sería un parpadeo raro.
    disabled: cargando || estaAutenticado || descartado,
    cancel_on_tap_outside: true,
    onSuccess: async (credentialResponse) => {
      const credential = credentialResponse.credential;
      if (!credential) return;
      try {
        const usuario = await loginConGoogle(credential, 'ESTUDIANTE');
        if (usuario) {
          setLastLoginMethod('GOOGLE');
          redirigirPorRol(usuario.rol);
        }
      } catch (err) {
        // One Tap es una conveniencia opcional, no un flujo crítico: si falla, no
        // interrumpimos al visitante con un toast, simplemente sigue disponible el
        // login normal (botón de Google o correo) en el modal.
        console.warn('Google One Tap: no se pudo completar el login', err);
      }
    },
    onError: () => {
      console.warn('Google One Tap: el prompt de Google devolvió un error');
    },
    promptMomentNotification: (notification) => {
      // Detecta que el usuario descartó el prompt (clic afuera, botón de cerrar, o
      // Google decide no reintentar) para no volver a mostrarlo en esta sesión.
      const descartadoPorUsuario =
        (notification.isSkippedMoment() && notification.getSkippedReason() !== 'issuing_failed') ||
        (notification.isDismissedMoment() && notification.getDismissedReason() !== 'credential_returned');
      if (descartadoPorUsuario) {
        marcarDescartado();
        setDescartado(true);
      }
    },
  });

  return null;
}
