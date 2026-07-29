'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function sanitizeNumberInput(raw: string, decimals: number): string {
  let cleaned = raw.replace(/[^\d.,]/g, '').replace(/,/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, decimals);
  }
  return cleaned;
}

function formatNumberDisplay(raw: string, decimals: number): string {
  if (!raw || raw === '.') return raw;
  const num = Number(raw);
  if (Number.isNaN(num)) return raw;
  const decimalPart = raw.split('.')[1];
  const minimumFractionDigits = raw.includes('.')
    ? Math.min(decimalPart?.length ?? 0, decimals)
    : 0;
  return num.toLocaleString('es-PE', { minimumFractionDigits, maximumFractionDigits: decimals });
}

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'prefix'> {
  /** Valor numérico "limpio" (sin separadores de miles), como string — listo para `parseFloat`. */
  value: string;
  /** Recibe el valor limpio (sin formato) en cada cambio; esto es lo que va al form. */
  onValueChange: (value: string) => void;
  /** Prefijo visible a la izquierda (moneda). `''` lo oculta. */
  prefix?: string;
  /** Resalta el borde en rojo (mismo patrón que el resto de inputs del form). */
  error?: boolean;
  /** Máximo de decimales admitidos y usados al formatear en blur. */
  decimals?: number;
}

/**
 * Input numérico con prefijo (ej. "S/") y separador de miles al perder foco. Mientras se
 * edita muestra el valor "crudo" (sin comas) para no pelear con la posición del cursor; el
 * valor que se reporta vía `onValueChange` siempre es el numérico limpio.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onValueChange,
      prefix = 'S/',
      error,
      decimals = 2,
      className,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = React.useState(false);
    const display = focused ? value : formatNumberDisplay(value, decimals);

    return (
      <div className="relative">
        {prefix && (
          <span
            className={cn(
              'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 select-none text-sm font-bold',
              error ? 'text-destructive/60' : 'text-muted-foreground',
            )}
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={display}
          onChange={(e) => onValueChange(sanitizeNumberInput(e.target.value, decimals))}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background py-2 pr-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            prefix ? 'pl-9' : 'pl-3',
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
NumberInput.displayName = 'NumberInput';

export { sanitizeNumberInput, formatNumberDisplay };
