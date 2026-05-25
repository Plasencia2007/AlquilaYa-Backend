'use client';

import { differenceInDays } from 'date-fns';

import { cn } from '@/lib/cn';
import { useHistorialStore } from '@/stores/history-store';

interface Props {
  propiedadId: string;
  fechaCreacion?: string;
  variant?: 'compact' | 'full' | 'feature';
  className?: string;
}

const NEW_THRESHOLD_DAYS = 7;

/**
 * Píldoras de personalización en la esquina superior izquierda del card.
 * - "Ya la viste" si el id está en el historial del estudiante.
 * - "Nuevo" si `fechaCreacion` está dentro de los últimos 7 días.
 *
 * En variante `compact` solo se muestra "Ya la viste" (per plan).
 */
export function PropertyPersonalizationBadges({
  propiedadId,
  fechaCreacion,
  variant = 'full',
  className,
}: Props) {
  const isViewed = useHistorialStore((s) => s.isViewed(propiedadId));

  let esNuevo = false;
  if (fechaCreacion) {
    const fecha = new Date(fechaCreacion);
    if (!Number.isNaN(fecha.getTime())) {
      const diff = differenceInDays(new Date(), fecha);
      esNuevo = diff >= 0 && diff < NEW_THRESHOLD_DAYS;
    }
  }

  const mostrarNuevo = variant !== 'compact' && esNuevo;

  if (!isViewed && !mostrarNuevo) return null;

  return (
    <div
      className={cn(
        'pointer-events-none flex flex-col items-start gap-1.5',
        className,
      )}
    >
      {isViewed && (
        <span className="rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          Ya la viste
        </span>
      )}
      {mostrarNuevo && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
          Nuevo
        </span>
      )}
    </div>
  );
}
