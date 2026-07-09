import { ErrorIllustration } from './illustrations';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

/**
 * Pantalla de error reutilizable para boundaries (`error.tsx`) y estados de fallo.
 * Mostrar siempre algo accionable: el botón "Reintentar" llama al handler que
 * provee Next.js (`unstable_retry` en el segmento de error).
 */
export function ErrorState({
  title = 'Algo salió mal',
  description = 'Ocurrió un error inesperado al cargar esta sección.',
  retryLabel = 'Reintentar',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <ErrorIllustration className="mb-2 size-32" />
      <h1 className="font-headline text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-6" variant="default">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
