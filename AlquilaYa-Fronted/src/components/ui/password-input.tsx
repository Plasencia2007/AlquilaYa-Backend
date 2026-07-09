'use client';

import * as React from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Muestra un ícono de candado a la izquierda (login, reset-password). */
  showIcon?: boolean;
}

/**
 * Input de contraseña con toggle mostrar/ocultar accesible. Reenvía el ref y
 * todas las props de input estándar, así que sirve tanto para RHF
 * (`{...field}`, incluye ref) como para estado controlado plano (value/onChange).
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showIcon = false, ...props }, ref) => {
    const [show, setShow] = React.useState(false);

    return (
      <div className="relative">
        {showIcon && (
          <Lock
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        )}
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn(
            'h-11 w-full rounded-xl border border-input bg-input px-4 pr-11 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50',
            showIcon && 'pl-11',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
