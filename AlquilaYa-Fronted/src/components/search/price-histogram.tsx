'use client';

import { useEffect, useMemo } from 'react';

import { cn } from '@/lib/cn';
import type { Filtros } from '@/schemas/search-schema';
import { usePriceDistributionStore } from '@/stores/price-distribution-store';

const NUM_BUCKETS = 28;

/**
 * Distribución representativa de respaldo: se muestra mientras carga la oferta real, o
 * si la petición falla / no hay resultados, para que el histograma nunca luzca vacío.
 */
const FALLBACK_BARS = [
  3, 5, 8, 12, 18, 24, 30, 38, 44, 50, 54, 58, 60, 58,
  54, 48, 42, 36, 30, 24, 18, 14, 10, 7, 5, 4, 3, 3,
];

/** Agrupa los precios en `n` buckets uniformes entre `min` y `max` (clamp a los bordes). */
function bucketsDesdePrecios(precios: number[], min: number, max: number, n: number): number[] {
  const buckets = new Array<number>(n).fill(0);
  const rango = max - min;
  if (rango <= 0) return buckets;
  const ancho = rango / n;
  for (const p of precios) {
    const clamped = Math.min(Math.max(p, min), max);
    let idx = Math.floor((clamped - min) / ancho);
    if (idx >= n) idx = n - 1;
    if (idx < 0) idx = 0;
    buckets[idx] += 1;
  }
  return buckets;
}

interface Props {
  /** Filtros aplicados: definen la oferta cuya distribución de precios se dibuja. */
  filtros: Filtros;
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
}

/**
 * Mini-histograma sobre el slider de precio (ítem 111): muestra dónde se concentra la
 * oferta para ayudar a elegir el rango (como Airbnb). Las barras dentro del rango
 * seleccionado se resaltan. Respeta `prefers-reduced-motion` (transiciones `motion-safe`).
 */
export function PriceHistogram({ filtros, min, max, valueMin, valueMax }: Props) {
  const cargar = usePriceDistributionStore((s) => s.cargar);
  const conDatos = usePriceDistributionStore((s) => s.conDatos);
  const precios = usePriceDistributionStore((s) => s.precios);

  // El sheet monta este componente al abrirse: pedimos la distribución real una vez.
  // El store cachea por firma de filtros, así que reabrir no re-dispara la petición.
  useEffect(() => {
    void cargar(filtros);
  }, [cargar, filtros]);

  const bars = useMemo(
    () =>
      conDatos && precios.length > 0
        ? bucketsDesdePrecios(precios, min, max, NUM_BUCKETS)
        : FALLBACK_BARS,
    [conDatos, precios, min, max],
  );

  const maxBar = Math.max(...bars, 1);
  const total = max - min;

  return (
    <div className="flex h-16 items-end gap-0.5" aria-hidden>
      {bars.map((h, i) => {
        const barMin = min + (total / bars.length) * i;
        const barMax = min + (total / bars.length) * (i + 1);
        const inRange = barMax > valueMin && barMin < valueMax;
        return (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-sm motion-safe:transition-[height,background-color] motion-safe:duration-300',
              inRange ? 'bg-foreground' : 'bg-muted-foreground/25',
            )}
            style={{ height: `${Math.max((h / maxBar) * 100, 4)}%` }}
          />
        );
      })}
    </div>
  );
}
