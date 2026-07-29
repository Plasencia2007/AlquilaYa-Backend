'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatPEN } from '@/lib/money';
import { depositoService, type Deposito } from '@/services/deposito-service';

interface Props {
  reservaId: string;
  className?: string;
}

const META: Record<
  Deposito['estado'],
  { label: string; icon: typeof ShieldCheck; bg: string; text: string }
> = {
  PENDIENTE: { label: 'Depósito pendiente de cobro', icon: ShieldAlert, bg: 'bg-muted', text: 'text-muted-foreground' },
  RETENIDO: { label: 'Retenido en garantía', icon: Lock, bg: 'bg-warning-light', text: 'text-warning' },
  RETENIDO_PARCIAL: { label: 'Devolución parcial', icon: ShieldAlert, bg: 'bg-warning-light', text: 'text-warning' },
  DEVUELTO: { label: 'Devuelto', icon: CheckCircle2, bg: 'bg-success-light', text: 'text-success' },
  PERDIDO: { label: 'Retenido por el arrendador', icon: ShieldAlert, bg: 'bg-destructive/10', text: 'text-destructive' },
};

/**
 * Estado del depósito de garantía de la reserva (G3, ítem 243). Consume el endpoint
 * self-service `GET /pagos/depositos/reserva/{id}` — si la reserva no tiene depósito asociado
 * (404 → `null`), el componente entero no se renderiza (no toda reserva pide garantía).
 */
export function DepositStatusCard({ reservaId, className }: Props) {
  const [deposito, setDeposito] = useState<Deposito | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    depositoService
      .obtenerPorReserva(reservaId)
      .then((d) => {
        if (!cancelado) setDeposito(d);
      })
      .catch(() => {
        if (!cancelado) setDeposito(null);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [reservaId]);

  if (cargando || !deposito) return null;

  const meta = META[deposito.estado];
  const Icon = meta.icon;

  return (
    <div className={cn('space-y-3 rounded-2xl border border-border bg-card p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-bold text-foreground">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          Depósito de garantía
        </h3>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold', meta.bg, meta.text)}>
          <Icon className="size-3.5" aria-hidden />
          {meta.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monto</p>
          <p className="tnum font-bold text-foreground">{formatPEN(deposito.monto)}</p>
        </div>
        {deposito.montoDevuelto != null && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {deposito.estado === 'DEVUELTO' ? 'Devuelto' : 'A devolver'}
            </p>
            <p className="tnum font-bold text-success">{formatPEN(deposito.montoDevuelto)}</p>
          </div>
        )}
      </div>

      {deposito.motivoRetencion && (
        <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">Motivo:</strong> {deposito.motivoRetencion}
        </p>
      )}
    </div>
  );
}
