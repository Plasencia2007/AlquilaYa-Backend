'use client';

import { useEffect, useState } from 'react';

/**
 * Devuelve `value` con un retraso de `ms` milisegundos. Útil para evitar
 * disparar fetch en cada keystroke de un input de búsqueda.
 */
export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);

  return debounced;
}
