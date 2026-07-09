import { useEffect } from 'react';
import type { GlobalProvider } from '@ladle/react';

import '../src/app/globals.css';

/**
 * Bridge entre el toggle de tema incorporado de Ladle (Light/Dark/Auto) y
 * nuestro mecanismo real de tema (`data-theme` en <html>, ver ThemeProvider).
 * Así el catálogo de componentes refleja el mismo look que la app real.
 */
export const Provider: GlobalProvider = ({ children, globalState }) => {
  useEffect(() => {
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resuelto =
      globalState.theme === 'dark' || (globalState.theme === 'auto' && prefiereDark)
        ? 'dark'
        : 'light';
    document.documentElement.dataset.theme = resuelto;
  }, [globalState.theme]);

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      {children}
    </div>
  );
};
