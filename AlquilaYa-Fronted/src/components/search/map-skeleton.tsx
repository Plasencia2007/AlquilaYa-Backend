'use client';

/**
 * 119 — Skeleton del mapa de resultados.
 *
 * Se muestra mientras Leaflet se carga por import dinámico (`ssr:false`). Ocupa
 * EXACTAMENTE el mismo espacio que el mapa (h-full w-full) para evitar layout
 * shift, con una cuadrícula tipo callejero + un par de "pines" con shimmer para
 * insinuar el mapa que está por aparecer.
 */

import { cn } from '@/lib/cn';

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('relative h-full w-full overflow-hidden bg-muted', className)}
      aria-hidden
      role="presentation"
    >
      {/* Cuadrícula de "calles" */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Un par de "avenidas" diagonales */}
      <div className="absolute -inset-x-10 top-1/3 h-8 -rotate-6 bg-background/50" />
      <div className="absolute -inset-x-10 top-2/3 h-6 rotate-3 bg-background/40" />

      {/* "Pines" (pastillas de precio) y un cluster, con shimmer */}
      <div className="absolute left-[22%] top-[36%] h-6 w-16 animate-pulse rounded-full bg-background/80 shadow" />
      <div className="absolute left-[54%] top-[28%] h-6 w-14 animate-pulse rounded-full bg-background/80 shadow" />
      <div className="absolute left-[44%] top-[58%] h-9 w-9 animate-pulse rounded-full bg-primary/60" />
      <div className="absolute left-[70%] top-[62%] h-6 w-16 animate-pulse rounded-full bg-background/80 shadow" />

      {/* Barrido de shimmer sobre todo el lienzo */}
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-transparent via-background/10 to-transparent" />
    </div>
  );
}
