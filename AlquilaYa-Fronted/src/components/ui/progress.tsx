import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Valor actual, 0-100. */
  value: number;
  /** Etiqueta accesible del progreso (ej. "3 de 5 documentos aprobados"). */
  label?: string;
}

/**
 * Barra de progreso compartida. No depende de Radix (no está instalado en el
 * proyecto) — expone los mismos atributos ARIA (`role="progressbar"`,
 * `aria-valuenow/min/max`) a mano para la misma accesibilidad.
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, label, ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, value));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
        {...props}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = 'Progress';

export { Progress };
