import { cn } from '@/lib/cn';
import { metaEstadoReserva } from '@/lib/reservation-status';
import type { EstadoReserva } from '@/types/reserva';

interface ReservationStatusBadgeProps {
  estado: EstadoReserva;
  className?: string;
  showIcon?: boolean;
}

export function ReservationStatusBadge({
  estado,
  className,
  showIcon = true,
}: ReservationStatusBadgeProps) {
  const meta = metaEstadoReserva(estado);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider',
        meta.bg,
        meta.text,
        meta.border,
        className,
      )}
    >
      {showIcon && <Icon className="size-3.5" aria-hidden />}
      {meta.label}
    </span>
  );
}
