'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GitCompare, Search } from 'lucide-react';

import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { PropertyCompareContent } from '@/components/student/property-compare-view';
import { MAX_COMPARE, useCompareStore } from '@/stores/compare-store';

/**
 * Cliente de la página `/comparar`. Lee los ids del `compare-store`
 * (persistido en sessionStorage con `skipHydration`, por eso rehidratamos
 * manualmente en el primer mount) y monta la tabla comparativa reutilizando
 * `PropertyCompareContent`. Estado vacío → mensaje + CTA a `/search`.
 */
export function CompararClient() {
  const selectedIds = useCompareStore((s) => s.selectedIds);
  const toggle = useCompareStore((s) => s.toggle);
  const clear = useCompareStore((s) => s.clear);

  const [hidratado, setHidratado] = useState(false);
  useEffect(() => {
    useCompareStore.persist.rehydrate()?.then(() => setHidratado(true));
  }, []);

  const ids = hidratado ? selectedIds : [];

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-24 sm:px-12 md:pt-28">
      <PageBreadcrumb
        className="mb-4"
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Explorar', href: '/search' },
          { label: 'Comparar' },
        ]}
      />

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Comparar propiedades
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ids.length > 0
              ? `${ids.length} de ${MAX_COMPARE} propiedades · precio, distancia, servicios y más, lado a lado.`
              : `Selecciona hasta ${MAX_COMPARE} propiedades para compararlas.`}
          </p>
        </div>
        {ids.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
          >
            Limpiar comparación
          </button>
        )}
      </header>

      {!hidratado ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Cargando…
        </div>
      ) : ids.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <PropertyCompareContent ids={ids} onQuitar={(id) => toggle(id)} />
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
        <GitCompare className="size-7" aria-hidden />
      </span>
      <div>
        <h2 className="font-headline text-lg font-bold text-foreground">
          Aún no hay nada que comparar
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Explora los cuartos disponibles y agrégalos a la comparación desde el menú de cada
          tarjeta. Puedes comparar hasta {MAX_COMPARE} a la vez.
        </p>
      </div>
      <Link
        href="/search"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
      >
        <Search className="size-4" aria-hidden />
        Explorar cuartos
      </Link>
    </div>
  );
}
