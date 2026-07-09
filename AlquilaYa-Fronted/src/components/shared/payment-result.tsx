import type { ReactNode } from 'react';
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
  return (
    <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Icon className={cn('size-20', colorClass)} aria-hidden />
      <div className="space-y-2">
        <h1 className="text-h1">{title}</h1>
        <div className="text-muted-foreground">{description}</div>
      </div>
      {actions}
    </div>
  );
}
