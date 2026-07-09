'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker `/sw.js` para instalabilidad PWA + shell offline.
 *
 * Se registra SOLO en producción: en `next dev` el SW interferiría con el HMR
 * y podría servir assets cacheados obsoletos. `process.env.NODE_ENV` se inlinea
 * en build, así que en dev este efecto retorna de inmediato.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((err) => {
          // No romper la app si el SW falla (navegador viejo, modo privado, etc.).
          console.error('[PWA] No se pudo registrar el service worker:', err);
        });
    };

    // Esperar a `load` para no competir con la carga inicial de la página.
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
