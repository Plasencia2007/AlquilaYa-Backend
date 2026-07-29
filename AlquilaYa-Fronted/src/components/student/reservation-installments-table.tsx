'use client';

import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CenteredSpinner } from '@/components/shared/centered-spinner';
import { cn } from '@/lib/cn';
import { formatPEN } from '@/lib/money';
import { formatearFecha } from '@/lib/relative-time';
import { notify } from '@/lib/notify';
import { reservationService, type CuotaRenta, type EstadoCuotaRenta } from '@/services/reservation-service';

interface Props {
  reservaId: string;
  className?: string;
}

const META_ESTADO: Record<EstadoCuotaRenta, { label: string; bg: string; text: string }> = {
  PENDIENTE: { label: 'Pendiente', bg: 'bg-muted', text: 'text-muted-foreground' },
  PAGADA: { label: 'Pagada', bg: 'bg-success-light', text: 'text-success' },
  VENCIDA: { label: 'Vencida', bg: 'bg-destructive/10', text: 'text-destructive' },
};

/**
 * Cronograma COMPLETO de cuotas de renta mensual (G2, ítem 242) — a diferencia del widget de
 * "próximo pago" del dashboard, que solo muestra la cuota pendiente más próxima a vencer.
 */
export function ReservationInstallmentsTable({ reservaId, className }: Props) {
  const [cuotas, setCuotas] = useState<CuotaRenta[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    reservationService
      .obtenerCuotas(reservaId)
      .then((data) => {
        if (!cancelado) setCuotas(data);
      })
      .catch(() => {
        if (!cancelado) setCuotas([]);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [reservaId]);

  if (cargando) {
    return (
      <div className={cn('rounded-2xl border border-border bg-card p-5', className)}>
        <CenteredSpinner className="py-8" label="Cargando cronograma…" />
      </div>
    );
  }

  // Reserva sin renta recurrente (ej. estadía corta ya cubierta en un solo pago): no hay nada
  // que mostrar, la sección entera desaparece en vez de un estado vacío.
  if (cuotas.length === 0) return null;

  // No hay endpoint de pago por cuota individual todavía (mismo hallazgo que el widget de
  // "próximo pago" del dashboard, ver student/page.tsx) — el CTA es honesto sobre eso: en vez
  // de simular un checkout que no existe, explica cómo coordinar el pago.
  const coordinarPago = (cuota: CuotaRenta) => {
    notify.info(
      `Cuota de ${cuota.periodo}`,
      'El pago de cuotas mensuales todavía se coordina directamente con tu arrendador — esta cuenta no tiene checkout en línea por cuota individual.',
    );
  };

  return (
    <div className={cn('space-y-3 rounded-2xl border border-border bg-card p-5', className)}>
      <h3 className="flex items-center gap-2 font-bold text-foreground">
        <CalendarClock className="size-4 text-primary" aria-hidden />
        Cronograma de renta
      </h3>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mes</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cuotas
            .sort((a, b) => a.numeroCuota - b.numeroCuota)
            .map((cuota) => {
              const meta = META_ESTADO[cuota.estado] ?? META_ESTADO.PENDIENTE;
              return (
                <TableRow key={cuota.id}>
                  <TableCell className="font-medium text-foreground">{cuota.periodo}</TableCell>
                  <TableCell className="tnum">{formatPEN(cuota.monto)}</TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold', meta.bg, meta.text)}>
                      {meta.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatearFecha(cuota.fechaVencimiento)}</TableCell>
                  <TableCell className="text-right">
                    {cuota.estado !== 'PAGADA' ? (
                      <button
                        type="button"
                        onClick={() => coordinarPago(cuota)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Coordinar pago
                      </button>
                    ) : (
                      cuota.fechaPago && (
                        <span className="text-xs text-muted-foreground">Pagó {formatearFecha(cuota.fechaPago)}</span>
                      )
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}
