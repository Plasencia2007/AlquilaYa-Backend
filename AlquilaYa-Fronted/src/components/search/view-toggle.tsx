'use client';

import { LayoutGrid, Map } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { Vista } from '@/schemas/search-schema';

interface Props {
  value: Vista;
  onChange: (v: Vista) => void;
  variant?: 'tabs' | 'fab';
  className?: string;
}

export function ViewToggle({ value, onChange, variant = 'tabs', className }: Props) {
  if (variant === 'fab') {
    const opuesta: Vista = value === 'lista' ? 'mapa' : 'lista';
    const Icon = opuesta === 'mapa' ? Map : LayoutGrid;
    return (
      <button
        type="button"
        onClick={() => onChange(opuesta)}
        className={cn(
          'fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-bold text-background shadow-2xl transition-transform active:scale-95 md:hidden',
          className,
        )}
        aria-label={`Cambiar a ${opuesta === 'mapa' ? 'mapa' : 'lista'}`}
      >
        <Icon className="size-4" aria-hidden />
        {opuesta === 'mapa' ? 'Mapa' : 'Lista'}
      </button>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Vista de resultados"
      className={cn(
        'inline-flex items-center rounded-full bg-muted p-1 shadow-sm',
        className,
      )}
    >
      {(['lista', 'mapa'] as const).map((v) => {
        const Icon = v === 'mapa' ? Map : LayoutGrid;
        const activo = v === value;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(v)}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
              activo
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden /> {v === 'mapa' ? 'Mapa' : 'Lista'}
          </button>
        );
      })}
    </div>
  );
}
