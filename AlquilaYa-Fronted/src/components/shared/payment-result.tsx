'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { cn } from '@/lib/cn';

type PaymentResultVariant = 'exito' | 'fallo' | 'pendiente';

const VARIANT_META: Record<PaymentResultVariant, { icon: LucideIcon; colorClass: string }> = {
  exito: { icon: CheckCircle2, colorClass: 'text-success' },
  fallo: { icon: XCircle, colorClass: 'text-destructive' },
  pendiente: { icon: Clock, colorClass: 'text-warning' },
};

interface PaymentResultProps {
  variant: PaymentResultVariant;
  title: string;
  description: ReactNode;
  /** Botón(es) de acción; cada página compone su propio CTA. */
  actions: ReactNode;
}

/** Pantalla de resultado de pago (éxito/fallo/pendiente), compartida por las 3 rutas de /pago. */
export function PaymentResult({ variant, title, description, actions }: PaymentResultProps) {
  const { icon: Icon, colorClass } = VARIANT_META[variant];
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Ítem 300: foco explícito al heading al aterrizar (y de nuevo si esta misma instancia
  // cambia de variante sin desmontarse, ej. la transición pendiente -> éxito del ítem 272).
  useEffect(() => {
    headingRef.current?.focus();
  }, [variant, title]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <Icon className={cn('size-20', colorClass)} aria-hidden />
      <div className="space-y-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-h1 rounded-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {title}
        </h1>
        <div className="text-muted-foreground">{description}</div>
      </div>
      {actions}
    </div>
  );
}
