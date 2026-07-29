'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface UseInViewOptions {
  rootMargin?: string;
  threshold?: number;
}

/**
 * Ítem 421 — diferir el montaje de widgets pesados (mapas Leaflet, etc.) hasta que la
 * sección se acerca a ser visible, sin penalizar el render inicial.
 *
 * Devuelve `[ref, inView, show]`:
 *  - `ref`: colocar en el elemento contenedor a observar.
 *  - `inView`: `true` la primera vez que el elemento entra en el viewport. Sin
 *    `IntersectionObserver` (navegador viejo, jsdom en tests) no hay forma de diferir:
 *    arranca en `true` de entrada. Se resuelve en el inicializador y no en el effect,
 *    porque un setState síncrono dentro del effect provoca un render en cascada
 *    (mismo patrón que ya usa `home-map-section.tsx`).
 *  - `show`: fuerza `inView = true` sin esperar el scroll — para un placeholder
 *    clickeable ("Ver mapa") que quiere montar al toque.
 *
 * Una vez `true`, `inView` se queda así: el objetivo es diferir el PRIMER montaje, no
 * desmontar/remontar el widget en cada scroll. Un elemento `display:none` (p. ej. un
 * paso de wizard oculto vía CSS en mobile) nunca intersecta, así que este hook también
 * evita montar el widget mientras esté oculto de esa forma.
 */
export function useInView<T extends HTMLElement>(
  { rootMargin = '200px', threshold = 0 }: UseInViewOptions = {},
): [RefObject<T | null>, boolean, () => void] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin, threshold]);

  const show = useCallback(() => setInView(true), []);

  return [ref, inView, show];
}
