'use client';

import { useEffect, useState } from 'react';

import { SearchBar } from '@/components/search/search-bar';
import { FilterChips } from '@/components/search/filter-chips';
import { FiltersSheet } from '@/components/search/filters-sheet';
import { SortDropdown } from '@/components/search/sort-dropdown';
import { UniversidadZonaFilter } from '@/components/search/universidad-zona-filter';
import { ViewToggle } from '@/components/search/view-toggle';
import { ResultsGrid } from '@/components/search/results-grid';
import { MapResults } from '@/components/search/map-results';
import { useSearchParamsState } from '@/hooks/use-search-params-state';
import { usePropertiesSearch } from '@/hooks/use-properties-search';
import { useAuth } from '@/hooks/use-auth';
import { studentProfileService } from '@/services/student-profile-service';
import { notify } from '@/lib/notify';
import type { Orden } from '@/schemas/search-schema';

export function SearchClient() {
  const { filtros, setFiltros, limpiarFiltros } = useSearchParamsState();

  // Coordenadas del usuario (geolocalización) para el orden "Cerca de mí". Fuera de la URL.
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { items, total, hasMore, cargando, cargandoMas, error, cargarMas, reintentar } =
    usePropertiesSearch(filtros, userCoords);

  // Universidad del estudiante logueado para preseleccionar su campus en el filtro.
  const { usuario } = useAuth();
  const [uniEstudiante, setUniEstudiante] = useState<string | undefined>();

  useEffect(() => {
    if (usuario?.rol !== 'ESTUDIANTE' || !usuario.perfilId) return;
    let cancel = false;
    studentProfileService
      .obtenerInfo(usuario.perfilId)
      .then((info) => { if (!cancel) setUniEstudiante(info.universidad ?? undefined); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [usuario?.rol, usuario?.perfilId]);

  // "Cerca de mí" pide geolocalización (opcional). Si se concede, ordena por cercanía a ti;
  // si se niega, no cambia el orden. Cualquier otro orden limpia las coordenadas.
  const handleOrden = (orden: Orden) => {
    if (orden === 'cercania') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        notify.error('Tu navegador no soporta geolocalización.', 'No disponible');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setFiltros({ orden: 'cercania' });
        },
        () => {
          notify.error('No pudimos obtener tu ubicación. Activa el permiso e inténtalo de nuevo.', 'Ubicación');
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
      return;
    }
    setUserCoords(null);
    setFiltros({ orden });
  };

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
          <UniversidadZonaFilter
            universidadId={filtros.universidadId}
            zonaId={filtros.zonaId}
            onChange={(next) => setFiltros(next)}
            defaultUniversidadNombre={uniEstudiante}
          />
          <FiltersSheet
            filtros={filtros}
            onApply={(next) => setFiltros(next)}
            onClear={limpiarFiltros}
            total={total}
          />
          <SortDropdown
            value={filtros.orden}
            onChange={handleOrden}
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
