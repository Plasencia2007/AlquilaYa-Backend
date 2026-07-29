'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { universidadService, type Universidad } from '@/services/universidad-service';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e']);

/** Monograma a partir del nombre (no hay logos en el modelo `Universidad`). */
function monograma(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter((w) => w && !CONECTORES.has(w.toLowerCase()));
  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return palabras
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function UniversitiesRow() {
  const [universidades, setUniversidades] = useState<Universidad[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    universidadService
      .listarActivas()
      .then((data) => {
        if (!cancelado) setUniversidades(data.filter((u) => u.activo !== false));
      })
      .catch(() => {
        if (!cancelado) setUniversidades([]);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (cargando) {
    return (
      <section className="bg-card px-6 py-16 sm:px-12 md:py-24">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <Skeleton className="mx-auto h-8 w-72" />
          <Skeleton className="mx-auto mt-3 h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  // Una "fila de universidades" con una sola (solo UPeU) es peor que no mostrar nada:
  // la migración multi-universidad todavía no es visible, así que la sección se omite.
  if (universidades.length <= 1) return null;

  return (
    <section className="bg-card px-6 py-16 sm:px-12 md:py-24">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
          <span className="h-px w-8 bg-primary" aria-hidden />
          Multi-universidad
        </span>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Universidades soportadas
        </h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Elige tu casa de estudios y encuentra cuartos verificados en su zona de cobertura.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {universidades.map((u) => {
          const hasColor = typeof u.color === 'string' && HEX_RE.test(u.color);
          return (
            <Link
              key={u.id}
              href={`/search?universidadId=${u.id}`}
              className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span
                style={hasColor ? { backgroundColor: u.color as string } : undefined}
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-inner',
                  !hasColor && 'bg-primary',
                )}
                aria-hidden
              >
                {monograma(u.nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold leading-tight text-foreground">
                  {u.nombre}
                </h3>
                {u.esPrincipal && (
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    Campus principal
                  </span>
                )}
              </div>
              <ArrowUpRight
                className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
