import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/cn';

interface CenteredSpinnerProps {
  className?: string;
  label?: string;
}

/** Spinner centrado para estados de carga dentro de una sección de página. */
export function CenteredSpinner({ className, label = 'Cargando…' }: CenteredSpinnerProps) {
  return (
    <div role="status" className={cn('flex justify-center py-20 text-muted-foreground', className)}>
      <Loader2 className="size-8 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
