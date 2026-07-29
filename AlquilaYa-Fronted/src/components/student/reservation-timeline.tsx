'use client';

import { Timeline, type TimelineStepStatus } from '@/components/shared/timeline';
import { pasosTimeline } from '@/lib/reservation-status';
import type { EstadoReserva } from '@/types/reserva';

interface Props {
  estado: EstadoReserva;
  motivoRechazo?: string;
}

export function ReservationTimeline({ estado, motivoRechazo }: Props) {
  const cancelado = estado === 'CANCELADA' || estado === 'RECHAZADA';

  const steps = pasosTimeline(estado).map((paso) => {
    const status: TimelineStepStatus = paso.completado
      ? 'completed'
      : paso.activo
        ? 'active'
        : 'pending';
    return { title: paso.titulo, description: paso.descripcion, status };
  });

  return (
    <div>
      <Timeline steps={steps} />

      {cancelado && motivoRechazo && (
        <div className="mt-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          <strong className="block font-bold">Motivo</strong>
          <span>{motivoRechazo}</span>
        </div>
      )}
    </div>
  );
}
