'use client';

import { SearchBar } from '@/components/search/search-bar';
import { FilterChips } from '@/components/search/filter-chips';
import { FiltersSheet } from '@/components/search/filters-sheet';
import { SortDropdown } from '@/components/search/sort-dropdown';
import { ViewToggle } from '@/components/search/view-toggle';
import { ResultsGrid } from '@/components/search/results-grid';
import { MapResults } from '@/components/search/map-results';
import { useSearchParamsState } from '@/hooks/use-search-params-state';
import { usePropertiesSearch } from '@/hooks/use-properties-search';

export function SearchClient() {
  const { filtros, setFiltros, limpiarFiltros } = useSearchParamsState();
  const { items, total, hasMore, cargando, cargandoMas, error, cargarMas, reintentar } =
    usePropertiesSearch(filtros);

  return (
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-20 sm:px-12 md:pt-24">
      <header className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Cuartos cerca de UPeU
            </h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">
              {cargando
                ? 'Cargando…'
                : total === 0
                  ? 'Sin resultados'
                  : `${total} cuarto${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`}
            </p>
          </div>

          <div className="hidden md:block">
            <ViewToggle
              value={filtros.view}
              onChange={(v) => setFiltros({ view: v })}
            />
          </div>
        </div>

        <SearchBar
          initialValue={filtros.zona ?? ''}
          onSubmit={(zona) => setFiltros({ zona: zona || undefined })}
        />

        <div className="flex flex-wrap items-center gap-3">
          <FiltersSheet
            filtros={filtros}
            onApply={(next) => setFiltros(next)}
            onClear={limpiarFiltros}
            total={total}
          />
          <SortDropdown
            value={filtros.orden}
            onChange={(orden) => setFiltros({ orden })}
          />
        </div>

        <FilterChips
          filtros={filtros}
          setFiltros={setFiltros}
          limpiarTodo={limpiarFiltros}
        />
      </header>

      <section className="mt-8">
        {filtros.view === 'mapa' ? (
          <MapResults propiedades={items} />
        ) : (
          <ResultsGrid
            items={items}
            cargando={cargando}
            cargandoMas={cargandoMas}
            hasMore={hasMore}
            error={error}
            onCargarMas={cargarMas}
            onReintentar={reintentar}
            onLimpiarFiltros={limpiarFiltros}
          />
        )}
      </section>

      <ViewToggle
        variant="fab"
        value={filtros.view}
        onChange={(v) => setFiltros({ view: v })}
      />
    </main>
  );
}
