'use client';

import { useEffect } from 'react';
import { initThemeStore } from '@/stores/theme-store';

/**
 * Inicializa el store de tema en el cliente leyendo localStorage y prefers-color-scheme.
 * Para evitar flash en primer paint, ver el script blocking en `app/layout.tsx`
 * que hace `document.documentElement.dataset.theme = ...` ANTES de hidratar.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initThemeStore();
  }, []);
  return <>{children}</>;
}
