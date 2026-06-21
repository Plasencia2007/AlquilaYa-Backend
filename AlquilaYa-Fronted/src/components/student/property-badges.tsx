'use client';

import { Flame, Sparkles, Tag, Zap } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { BadgePropiedad } from '@/types/propiedad';

/** Estilo e ícono por tipo de badge. Calculados en el backend ({@code BadgeCalculator}). */
const CONFIG: Record<
  BadgePropiedad,
  { label: string; className: string; Icon: typeof Sparkles }
> = {
  ULTIMA_PLAZA: { label: 'Última plaza', className: 'bg-red-600 text-white', Icon: Zap },
  REBAJA: { label: 'Rebaja', className: 'bg-emerald-600 text-white', Icon: Tag },
  NUEVO: { label: 'Nuevo', className: 'bg-primary text-primary-foreground', Icon: Sparkles },
  POPULAR: { label: 'Popular', className: 'bg-amber-500 text-white', Icon: Flame },
};

/** Orden de prioridad: lo más "urgente"/accionable primero. */
const ORDEN: BadgePropiedad[] = ['ULTIMA_PLAZA', 'REBAJA', 'NUEVO', 'POPULAR'];

interface Props {
  badges?: BadgePropiedad[];
  /** Máximo de chips a mostrar (evita saturar el card). */
  max?: number;
  /** Apilado vertical (overlay del card) u horizontal (cabecera de la ficha). */
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

/**
 * Chips de distintivos automáticos (nuevo/popular/última plaza/rebaja) que el backend
 * calcula al vuelo. Se ordenan por urgencia y se recortan a {@code max}.
 */
export function PropertyBadges({ badges, max = 3, orientation = 'vertical', className }: Props) {
  if (!badges || badges.length === 0) return null;
  const visibles = ORDEN.filter((b) => badges.includes(b)).slice(0, max);
  if (visibles.length === 0) return null;

  return (
    <div
      className={cn(
        'pointer-events-none flex items-start gap-1.5',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className,
      )}
    >
      {visibles.map((b) => {
        const { label, className: chip, Icon } = CONFIG[b];
        return (
          <span
            key={b}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm',
              chip,
            )}
          >
            <Icon className="size-3" aria-hidden />
            {label}
          </span>
        );
      })}
    </div>
  );
}
