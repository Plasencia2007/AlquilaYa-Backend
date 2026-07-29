'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => {};
}

/**
 * True solo tras la hidratación en el cliente. Reemplaza el patrón
 * `useState(false)` + `useEffect(() => setMounted(true), [])` — ese setState
 * síncrono dentro de un efecto viola `react-hooks/set-state-in-effect`.
 * `useSyncExternalStore` resuelve lo mismo sin efecto ni setState: el snapshot
 * de servidor es `false`, el de cliente `true`, y React reconcilia la diferencia
 * en la hidratación sin desincronizar el DOM.
 *
 * Uso típico: gatear un `createPortal` (o cualquier API solo-cliente) hasta
 * que el componente ya esté montado en el navegador.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
