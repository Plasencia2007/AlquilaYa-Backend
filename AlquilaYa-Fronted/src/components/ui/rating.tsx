'use client';

import { useState, type KeyboardEvent } from 'react';
import { Star } from 'lucide-react';

import { cn } from '@/lib/cn';

type Size = 'sm' | 'md' | 'lg';

const ICON_SIZE: Record<Size, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};

interface ReadonlyRatingProps {
  mode?: 'readonly';
  value: number;
  size?: Size;
  showValue?: boolean;
  className?: string;
}

interface InteractiveRatingProps {
  mode: 'interactive';
  value: number;
  onChange: (value: number) => void;
  size?: Size;
  name?: string;
  disabled?: boolean;
  className?: string;
}

type RatingProps = ReadonlyRatingProps | InteractiveRatingProps;

/**
 * Estrellas único para toda la app (ítem 57 de MEJORAS.md).
 * - `readonly` (default): media con fracción (ej. 4.3 llena el 5to icono al 30%).
 * - `interactive`: value/onChange compatible con react-hook-form (Controller),
 *   navegable con ←→ y clic/hover.
 * Color por el token `--color-warning` (ya definido en globals.css).
 */
export function Rating(props: RatingProps) {
  if (props.mode === 'interactive') {
    return <InteractiveRating {...props} />;
  }
  return <ReadonlyRating {...props} />;
}

function ReadonlyRating({ value, size = 'md', showValue, className }: ReadonlyRatingProps) {
  const clamped = Math.max(0, Math.min(5, value || 0));
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="inline-flex gap-0.5" role="img" aria-label={`${clamped.toFixed(1)} de 5 estrellas`}>
        {[1, 2, 3, 4, 5].map((s) => {
          const fill = Math.max(0, Math.min(1, clamped - (s - 1))) * 100;
          return (
            <span key={s} className="relative inline-block">
              <Star className={cn(ICON_SIZE[size], 'fill-muted text-muted-foreground/30')} aria-hidden />
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                  <Star className={cn(ICON_SIZE[size], 'fill-warning text-warning')} aria-hidden />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {showValue && <span className="tnum text-sm font-bold text-foreground">{clamped.toFixed(1)}</span>}
    </span>
  );
}

function InteractiveRating({
  value,
  onChange,
  size = 'lg',
  name,
  disabled,
  className,
}: InteractiveRatingProps) {
  const [hover, setHover] = useState(0);
  const activo = hover || value;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, (value || 0) - 1));
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Calificación"
      onKeyDown={onKeyDown}
      className={cn('inline-flex gap-1', className)}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          aria-label={`${s} ${s === 1 ? 'estrella' : 'estrellas'}`}
          name={name}
          disabled={disabled}
          tabIndex={s === (value || 1) ? 0 : -1}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(s)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-50"
        >
          <Star
            className={cn(
              ICON_SIZE[size],
              s <= activo ? 'fill-warning text-warning' : 'fill-muted text-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  );
}
