'use client';

import { Clock } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useCountdown } from '@/hooks/use-countdown';

interface Props {
  /** ISO string. Solo tiene sentido mientras `reserva.estado === 'APROBADA'` (ítem 238). */
  fechaExpiracion: string;
  className?: string;
}

const SEIS_HORAS_MS = 6 * 60;

/**
 * Cuenta regresiva viva hasta `fechaExpiracion` de una reserva APROBADA sin pagar (ítem 238).
 * La lógica de cálculo vive en `useCountdown` (ítem 273) — este componente solo la pinta.
 *
 * El scheduler del backend que marca EXPIRADA corre cada hora (ver
 * `ReconfirmacionScheduler`/config de expiración), así que puede haber un margen donde
 * `fechaExpiracion` ya pasó pero el estado todavía no cambió — en ese caso mostramos
 * "Expirando..." en vez de un conteo negativo.
 */
export function ReservationExpiryCountdown({ fechaExpiracion, className }: Props) {
  const { horasRestantes, minutosRestantes, expirado, texto } = useCountdown(fechaExpiracion);
  const urgente = !expirado && horasRestantes * 60 + minutosRestantes < SEIS_HORAS_MS;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold',
        expirado || urgente ? 'bg-warning-light text-warning' : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      <Clock className="size-3.5" aria-hidden />
      {texto}
    </span>
  );
}
