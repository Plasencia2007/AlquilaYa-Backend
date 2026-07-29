'use client';

import { useEffect } from 'react';

/**
 * Activa `@axe-core/react` SOLO en desarrollo (ítem 391 de MEJORAS.md):
 * audita el árbol de React montado y loguea violaciones de accesibilidad en
 * la consola del navegador (contraste, labels faltantes, roles ARIA
 * inválidos, orden de foco, etc.) cada vez que el árbol se re-renderiza,
 * con un debounce de 1s.
 *
 * No corre en producción ni en SSR: el import de `@axe-core/react` (que
 * parchea `React.createElement` para inyectar sus checks) es dinámico y
 * queda gateado por `NODE_ENV`, así que ni siquiera entra en el bundle de
 * prod. El componente se monta una sola vez en `app/layout.tsx` y no
 * renderiza nada.
 *
 * El `useEffect` no hace `setState` (solo dispara un import + arranca el
 * observer interno de axe), así que no viola `react-hooks/set-state-in-effect`.
 */
export function AxeProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    let cancelado = false;
    Promise.all([import('@axe-core/react'), import('react'), import('react-dom')]).then(
      ([axeModule, React, ReactDOM]) => {
        if (cancelado) return;
        const axe = axeModule.default;
        // Ítem 391: `@axe-core/react` loguea sus violaciones directo en consola
        // (no expone callback) — es su comportamiento esperado en dev.
        axe(React, ReactDOM, 1000);
      },
    );

    return () => {
      cancelado = true;
    };
  }, []);

  return null;
}
