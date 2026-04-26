'use client';

import { useEffect, useState } from 'react';

/**
 * Hook reactivo a media queries (ej. `'(min-width: 768px)'`).
 * SSR-safe: durante el render del servidor devuelve `false`, luego el efecto
 * actualiza al valor real en el cliente.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
