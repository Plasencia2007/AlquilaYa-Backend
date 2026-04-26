'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/shared/error-state';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

// Boundary para errores en el root layout. Debe renderizar <html>+<body>
// porque a este nivel no hay layout padre. NO usar i18n aquí: si el provider
// de intl falló, useTranslations también fallaría.
export default function GlobalError({ error, unstable_retry }: GlobalErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Global error boundary:', error);
  }, [error]);

  return (
    <html lang="es">
      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground">
        <ErrorState
          title="Algo salió muy mal"
          description="Ocurrió un error grave en la aplicación. Recargá la página."
          retryLabel="Reintentar"
          onRetry={unstable_retry}
        />
      </body>
    </html>
  );
}
