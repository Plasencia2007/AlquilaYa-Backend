'use client';

import { cn } from '@/lib/cn';
import { useHistorialStore } from '@/stores/history-store';

interface Props {
  propiedadId: string;
  className?: string;
}

/**
 * Píldora de personalización en la esquina superior izquierda del card:
 * "Ya la viste" si el id está en el historial del estudiante.
 *
 * El badge "Nuevo" ya NO se calcula aquí: lo provee el backend como badge
 * automático (ver {@code PropertyBadges} / {@code BadgeCalculator}).
 */
export function PropertyPersonalizationBadges({ propiedadId, className }: Props) {
  const isViewed = useHistorialStore((s) => s.isViewed(propiedadId));

  if (!isViewed) return null;

  return (
    <div
      className={cn(
        'pointer-events-none flex flex-col items-start gap-1.5',
        className,
      )}
    >
      <span className="rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
        Ya la viste
      </span>
    </div>
  );
}
