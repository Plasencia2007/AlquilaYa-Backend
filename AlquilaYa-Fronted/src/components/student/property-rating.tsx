'use client';

import { Star } from 'lucide-react';

import { cn } from '@/lib/cn';

interface Props {
  calificacion: number;
  totalResenas: number;
  fechaCreacion?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Rating del card.
 * - Con reseñas: `★ 5.0 (12)`.
 * - Sin reseñas: `Sin reseñas` en muted.
 *
 * `fechaCreacion` se recibe para mantener la firma del contrato; en el futuro
 * se puede usar para distinguir "propiedad muy nueva" vs. "no popular".
 */
export function PropertyRating({
  calificacion,
  totalResenas,
  size = 'sm',
  className,
}: Props) {
  const textSize = size === 'md' ? 'text-sm' : 'text-xs';
  const iconSize = size === 'md' ? 'size-4' : 'size-3.5';

  if (!totalResenas || totalResenas <= 0) {
    return (
      <span className={cn('flex shrink-0 items-center gap-0.5 text-muted-foreground', textSize, className)}>
        <Star className={cn(iconSize, 'fill-muted-foreground/60 text-muted-foreground/60')} aria-hidden />
        <span className="font-medium">Novedad</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1 font-bold text-foreground',
        textSize,
        className,
      )}
    >
      <Star className={cn(iconSize, 'fill-warning text-warning')} aria-hidden />
      <span>{calificacion.toFixed(1)}</span>
      <span className="font-normal text-muted-foreground">({totalResenas})</span>
    </span>
  );
}
