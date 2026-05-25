'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { X, GitCompare } from 'lucide-react';

import { useCompareStore, MAX_COMPARE } from '@/stores/compare-store';
import { cn } from '@/lib/cn';

const PropertyCompareView = dynamic(
  () =>
    import('./property-compare-view').then((m) => m.PropertyCompareView),
  { ssr: false },
);

/**
 * Barra flotante fija al fondo del viewport, visible cuando hay al menos
 * una propiedad seleccionada para comparar. Usa transforms para mostrarse
 * y ocultarse sin causar layout shift.
 *
 * Hidratación: `useCompareStore` está configurado con `skipHydration: true`,
 * así que rehidratamos manualmente en el primer mount del cliente para no
 * pisar el sessionStorage.
 *
 * Thumbnails: por ahora muestra bloques de color con el ID truncado. Una
 * mejora futura sería un `compare-preview-store` que cachee `{ id, titulo,
 * imagen }` en el momento del toggle.
 */
export function PropertyCompareBar() {
  const selectedIds = useCompareStore((s) => s.selectedIds);
  const toggle = useCompareStore((s) => s.toggle);
  const clear = useCompareStore((s) => s.clear);

  const [hidratado, setHidratado] = useState(false);
  const [abrirComparar, setAbrirComparar] = useState(false);

  useEffect(() => {
    useCompareStore.persist.rehydrate()?.then(() => setHidratado(true));
  }, []);

  const ids = hidratado ? selectedIds : [];
  const visible = ids.length >= 1;

  return (
    <>
      <div
        role="region"
        aria-label="Barra de comparación"
        aria-hidden={!visible}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur',
          'shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]',
          'transition-transform duration-300 ease-out motion-reduce:transition-none',
          visible ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            {Array.from({ length: MAX_COMPARE }).map((_, idx) => {
              const id = ids[idx];
              if (!id) {
                return (
                  <div
                    key={`slot-${idx}`}
                    className="hidden size-[60px] shrink-0 rounded-md border border-dashed border-border/60 sm:block"
                    aria-hidden
                  />
                );
              }
              // Bloques placeholder con un color derivado del id, mostrando los
              // últimos 3 chars del id. Suficiente para que el usuario
              // distingue las cards seleccionadas; el modal mostrará el detalle real.
              return (
                <div
                  key={id}
                  className="relative size-[60px] shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border"
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 grid place-items-center text-[10px] font-mono text-muted-foreground"
                    style={{
                      background: `linear-gradient(135deg, hsl(${
                        (Number(id) * 47) % 360
                      } 60% 85%), hsl(${(Number(id) * 47 + 60) % 360} 60% 75%))`,
                    }}
                  >
                    #{String(id).slice(-3)}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    aria-label={`Quitar propiedad ${id} de la comparación`}
                    className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-background/90 text-foreground shadow ring-1 ring-border transition hover:bg-background"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={clear}
              className="hidden text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline sm:inline"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setAbrirComparar(true)}
              disabled={ids.length < 1}
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition',
                'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <GitCompare className="size-4" aria-hidden />
              Comparar ({ids.length})
            </button>
            <button
              type="button"
              onClick={clear}
              aria-label="Limpiar comparación"
              className="sm:hidden grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {abrirComparar && (
        <PropertyCompareView
          ids={ids}
          open={abrirComparar}
          onClose={() => setAbrirComparar(false)}
        />
      )}
    </>
  );
}

export default PropertyCompareBar;
