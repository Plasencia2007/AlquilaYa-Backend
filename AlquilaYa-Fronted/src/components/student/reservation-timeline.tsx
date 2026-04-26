'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';
import { pasosTimeline } from '@/lib/reservation-status';
import type { EstadoReserva } from '@/types/reserva';

interface Props {
  estado: EstadoReserva;
  motivoRechazo?: string;
}

export function ReservationTimeline({ estado, motivoRechazo }: Props) {
  const pasos = pasosTimeline(estado);
  const cancelado = estado === 'CANCELADA' || estado === 'RECHAZADA';

  return (
    <ol className="space-y-4">
      {pasos.map((paso, i) => (
        <li key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-bold',
                paso.completado && 'border-primary bg-primary text-primary-foreground',
                paso.activo && !paso.completado && 'border-primary bg-background text-primary',
                !paso.completado && !paso.activo && 'border-border bg-background text-muted-foreground',
              )}
            >
              {paso.completado ? <Check className="size-3.5" /> : i + 1}
            </span>
            {i < pasos.length - 1 && (
              <span
                className={cn(
                  'mt-1 h-8 w-px',
                  paso.completado ? 'bg-primary' : 'bg-border',
                )}
                aria-hidden
              />
            )}
          </div>
          <div className="flex-1 pb-2">
            <p
              className={cn(
                'text-sm font-bold',
                (paso.completado || paso.activo) ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {paso.titulo}
            </p>
            <p className="text-xs text-muted-foreground">{paso.descripcion}</p>
          </div>
        </li>
      ))}

      {cancelado && motivoRechazo && (
        <li className="rounded-xl bg-red-50 p-3 text-xs text-red-800">
          <strong className="block font-bold">Motivo</strong>
          <span>{motivoRechazo}</span>
        </li>
      )}
    </ol>
  );
}
