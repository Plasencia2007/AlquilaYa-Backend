'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

// En el servidor asumimos "sin preferencia" (mismo criterio que el CSS:
// `@media (prefers-reduced-motion: no-preference)` es el caso por defecto).
// El cliente corrige el valor real en la hidratación.
function getServerSnapshot() {
  return false;
}

/**
 * true si el usuario pidió `prefers-reduced-motion: reduce` en su SO/navegador
 * (ítem 401 de MEJORAS.md). Usa `useSyncExternalStore` — mismo patrón que
 * `useHasMounted` (`src/hooks/use-has-mounted.ts`) — para suscribirse a
 * `matchMedia` sin el `useState` + `useEffect` con setState síncrono que
 * viola `react-hooks/set-state-in-effect`.
 *
 * Nota de alcance: la mayoría de animaciones con la librería `motion`
 * (`src/components/motion/fade-in.tsx`, `slide-up.tsx`, `stagger.tsx`,
 * `reveal-on-scroll.tsx`) ya usan el `useReducedMotion` propio de
 * `motion/react`, y el confetti de pago exitoso (`pago/exito/page.tsx`)
 * también. El Ken Burns del hero (`.animate-ken-burns` en `globals.css`) ya
 * está gateado a nivel CSS con `@media (prefers-reduced-motion: no-preference)`.
 * Este hook es para el resto de casos: animaciones/temporizadores condicionados
 * desde JS que NO pasan por `motion/react` (p.ej. `canvas-confetti` suelto,
 * clases CSS alternadas a mano, `IntersectionObserver` con scroll-jacking).
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
