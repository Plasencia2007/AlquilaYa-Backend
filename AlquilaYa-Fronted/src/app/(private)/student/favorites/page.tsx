'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, GitCompare, LayoutGrid, List, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/student/property-card';
import { FavoriteCollectionsMenu } from '@/components/student/favorite-collections-menu';
import { FavoriteNewCollectionButton } from '@/components/student/favorite-new-collection-button';
import { FavoriteNotePopover } from '@/components/student/favorite-note-popover';
import { FavoritePropertyListRow } from '@/components/student/favorite-property-list-row';
import { SkeletonCardGrid } from '@/components/shared/skeleton-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyFavoritesIllustration } from '@/components/shared/illustrations';
import { favoriteService, type FavoritoItem } from '@/services/favorite-service';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { tiempoRelativo } from '@/lib/relative-time';
import { useHiddenPropertiesStore } from '@/stores/hidden-properties-store';
import { MAX_COMPARE, useCompareStore } from '@/stores/compare-store';
import { useFavoriteCollectionsStore } from '@/stores/favorite-collections-store';
import type { Propiedad } from '@/types/propiedad';

const PAGE_SIZE = 12;

type Vista = 'grid' | 'lista';
const VISTA_STORAGE_KEY = 'alquilaya-favoritos-vista';

/** Una propiedad archivada/rechazada ya no se puede alquilar aunque conserve su flag. */
function noDisponible(p: Propiedad): boolean {
  return !p.disponible || p.estado === 'ARCHIVADO' || p.estado === 'RECHAZADO';
}

/**
 * Preferencia grid/lista (ítem 247): un solo booleano, no amerita un store de
 * zustand — lazy init leyendo `localStorage` directo alcanza. A diferencia de
 * los stores persistidos (`hidden-properties-store`, `favorite-collections-store`),
 * esto no necesita `skipHydration` + rehidratación en efecto porque no es
 * sensible a un pequeño mismatch de hidratación (solo cambia qué layout se pinta).
 */
function leerVistaGuardada(): Vista {
  if (typeof window === 'undefined') return 'grid';
  return window.localStorage.getItem(VISTA_STORAGE_KEY) === 'lista' ? 'lista' : 'grid';
}

/** Chip de filtro de colección (ítem 231). */
function ColeccionChip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        activo
          ? 'border-foreground bg-foreground text-background'
          : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export default function StudentFavoritesPage() {
  const router = useRouter();

  const [items, setItems] = useState<FavoritoItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [cargandoMas, setCargandoMas] = useState(false);

  const hiddenIds = useHiddenPropertiesStore((s) => s.hiddenIds);
  const [hidratado, setHidratado] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  // Colecciones/notas (ítems 231 y 233) — store persistido, se rehidrata acá
  // (patrón de `hidden-properties-store`: skipHydration + rehydrate() manual
  // en un efecto, el setState solo corre dentro del `.then()`).
  const colecciones = useFavoriteCollectionsStore((s) => s.colecciones);
  const asignaciones = useFavoriteCollectionsStore((s) => s.asignaciones);
  const [colHidratado, setColHidratado] = useState(false);
  const [coleccionFiltro, setColeccionFiltro] = useState<string | null>(null);

  // Modo selección + comparar (ítem 232) — reusa compare-store tal cual, sin
  // store propio, para que lo seleccionado acá sea lo mismo que ve `PropertyCompareBar`.
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const compareIds = useCompareStore((s) => s.selectedIds);

  // Vista grid/lista (ítem 247)
  const [vista, setVista] = useState<Vista>(leerVistaGuardada);

  useEffect(() => {
    useHiddenPropertiesStore.persist.rehydrate()?.then(() => setHidratado(true));
  }, []);

  useEffect(() => {
    useFavoriteCollectionsStore.persist.rehydrate()?.then(() => setColHidratado(true));
  }, []);

  const cambiarVista = useCallback((siguiente: Vista) => {
    setVista(siguiente);
    window.localStorage.setItem(VISTA_STORAGE_KEY, siguiente);
  }, []);

  const visiblesPorOcultos = useMemo(() => {
    if (!hidratado || showHidden) return items;
    return items.filter((f) => !hiddenIds.includes(f.propiedad.id));
  }, [items, hiddenIds, showHidden, hidratado]);

  const hiddenCount = items.length - visiblesPorOcultos.length;

  const visibles = useMemo(() => {
    if (!coleccionFiltro || !colHidratado) return visiblesPorOcultos;
    return visiblesPorOcultos.filter((f) =>
      (asignaciones[f.propiedad.id] ?? []).includes(coleccionFiltro),
    );
  }, [visiblesPorOcultos, coleccionFiltro, asignaciones, colHidratado]);

  useEffect(() => {
    let cancelado = false;
    favoriteService
      .listarPagina(0, PAGE_SIZE)
      .then((pagina) => {
        if (cancelado) return;
        setItems(pagina.items);
        setHasNext(pagina.hasNext);
        setPage(0);
        setEstado('ok');
      })
      .catch((err) => {
        if (cancelado) return;
        notify.error(err, 'No pudimos cargar tus favoritos');
        setEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const cargarMas = useCallback(async () => {
    setCargandoMas(true);
    try {
      const pagina = await favoriteService.listarPagina(page + 1, PAGE_SIZE);
      setItems((prev) => [...prev, ...pagina.items]);
      setHasNext(pagina.hasNext);
      setPage((p) => p + 1);
    } catch (err) {
      notify.error(err, 'No pudimos cargar más favoritos');
    } finally {
      setCargandoMas(false);
    }
  }, [page]);

  /**
   * Alterna la selección de una propiedad en `compare-store`, respetando su
   * límite (`MAX_COMPARE`/`canAdd()`). Usa `getState()` en vez de hooks para
   * mantenerse referencialmente estable entre renders (no rompe el `memo` de
   * `PropertyCard`) y para leer siempre el valor más fresco.
   */
  const handleToggleCompare = useCallback((propiedadId: string) => {
    const store = useCompareStore.getState();
    if (!store.has(propiedadId) && !store.canAdd()) {
      notify.warning(
        'Límite de comparación alcanzado',
        `Solo puedes comparar hasta ${MAX_COMPARE} propiedades a la vez.`,
      );
      return;
    }
    store.toggle(propiedadId);
  }, []);

  const mostrarBarraComparar = modoSeleccion && vista === 'grid' && compareIds.length >= 2;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-h1">
          Mis favoritos
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Los cuartos que guardaste para revisar después.
        </p>
      </header>

      {estado === 'cargando' && <SkeletonCardGrid count={6} />}

      {estado === 'error' && (
        <ErrorState
          title="No pudimos cargar tus favoritos"
          description="Inténtalo de nuevo en un momento."
          retryLabel="Reintentar"
          onRetry={() => window.location.reload()}
        />
      )}

      {estado === 'ok' && items.length === 0 && (
        <EmptyState
          illustration={EmptyFavoritesIllustration}
          title="Aún no tienes favoritos"
          description="Explora cuartos y guárdalos con el corazón para verlos aquí."
          action={{ type: 'link', label: 'Explorar cuartos', href: '/search' }}
        />
      )}

      {estado === 'ok' && items.length > 0 && (
        <>
          {/* Toolbar: chips de colección + modo selección + toggle grid/lista */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <ColeccionChip activo={coleccionFiltro === null} onClick={() => setColeccionFiltro(null)}>
                Todas
              </ColeccionChip>
              {colecciones.map((coleccion) => (
                <ColeccionChip
                  key={coleccion}
                  activo={coleccionFiltro === coleccion}
                  onClick={() => setColeccionFiltro(coleccion === coleccionFiltro ? null : coleccion)}
                >
                  {coleccion}
                </ColeccionChip>
              ))}
              <FavoriteNewCollectionButton />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {vista === 'grid' && (
                <Button
                  type="button"
                  variant={modoSeleccion ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModoSeleccion((v) => !v)}
                >
                  <CheckSquare className="size-4" aria-hidden />
                  {modoSeleccion ? 'Cancelar selección' : 'Seleccionar'}
                </Button>
              )}

              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => cambiarVista('grid')}
                  aria-pressed={vista === 'grid'}
                  aria-label="Vista cuadrícula"
                  className={cn(
                    'flex size-8 items-center justify-center rounded transition-colors',
                    vista === 'grid'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <LayoutGrid className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => cambiarVista('lista')}
                  aria-pressed={vista === 'lista'}
                  aria-label="Vista lista"
                  className={cn(
                    'flex size-8 items-center justify-center rounded transition-colors',
                    vista === 'lista'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <List className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {visibles.length === 0 && coleccionFiltro && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
              No tienes favoritos en &ldquo;{coleccionFiltro}&rdquo; todavía.
            </div>
          )}

          {visibles.length > 0 && vista === 'grid' && (
            <div className="card-grid">
              {visibles.map(({ propiedad, guardadoEn }) => {
                const inactiva = noDisponible(propiedad);
                const seleccionada = compareIds.includes(propiedad.id);
                const coleccionesAsignadas = asignaciones[propiedad.id] ?? [];
                return (
                  <div key={propiedad.id} className={inactiva ? 'opacity-70' : undefined}>
                    <PropertyCard
                      propiedad={inactiva ? { ...propiedad, disponible: false } : propiedad}
                      variant="full"
                      selectable={modoSeleccion}
                      selected={seleccionada}
                      onToggleSelect={() => handleToggleCompare(propiedad.id)}
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Guardado {tiempoRelativo(guardadoEn)}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <FavoriteNotePopover propiedadId={propiedad.id} />
                        <FavoriteCollectionsMenu propiedadId={propiedad.id} />
                      </div>
                    </div>

                    {coleccionesAsignadas.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {coleccionesAsignadas.map((c) => (
                          <Badge key={c} variant="secondary" className="text-[10px] font-medium">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {visibles.length > 0 && vista === 'lista' && (
            <div className="flex flex-col gap-2">
              {visibles.map(({ propiedad }) => (
                <FavoritePropertyListRow key={propiedad.id} propiedad={propiedad} />
              ))}
            </div>
          )}

          {hiddenCount > 0 && !showHidden && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setShowHidden(true)}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Mostrar {hiddenCount} oculta{hiddenCount === 1 ? '' : 's'}
              </button>
            </div>
          )}

          {hasNext && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={cargarMas}
                disabled={cargandoMas}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                {cargandoMas && <Loader2 className="h-4 w-4 animate-spin" />}
                {cargandoMas ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Barra "Comparar (n)" propia del modo selección — navega directo a la página
          completa /comparar (ítem 121), a diferencia de `PropertyCompareBar` (montada
          globalmente) que abre un modal. Se posiciona por encima de esa barra global
          para no solaparse, ya que ambas pueden estar visibles a la vez (esta requiere
          2+ seleccionados; la global aparece desde 1). */}
      {mostrarBarraComparar && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur">
            <span className="text-sm font-medium text-foreground">
              {compareIds.length} seleccionadas
            </span>
            <Button type="button" size="sm" onClick={() => router.push('/comparar')}>
              <GitCompare className="size-4" aria-hidden />
              Comparar ({compareIds.length})
            </Button>
            <button
              type="button"
              onClick={() => setModoSeleccion(false)}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
