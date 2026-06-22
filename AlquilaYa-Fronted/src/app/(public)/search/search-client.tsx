'use client';

import { useEffect, useState } from 'react';

import { WhereSearch } from '@/components/search/where-search';
import { FilterChips } from '@/components/search/filter-chips';
import { FiltersSheet } from '@/components/search/filters-sheet';
import { SortDropdown } from '@/components/search/sort-dropdown';
import { ViewToggle } from '@/components/search/view-toggle';
import { ResultsGrid } from '@/components/search/results-grid';
import { MapResults } from '@/components/search/map-results';
import { useSearchParamsState } from '@/hooks/use-search-params-state';
import { usePropertiesSearch } from '@/hooks/use-properties-search';
import { useAuth } from '@/hooks/use-auth';
import { studentProfileService } from '@/services/student-profile-service';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import type { Orden } from '@/schemas/search-schema';

export function SearchClient() {
  const { filtros, setFiltros, limpiarFiltros } = useSearchParamsState();

  // Coordenadas del usuario (geolocalización) para el orden "Cerca de mí". Fuera de la URL.
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Propiedad resaltada: sincroniza hover entre el grid y el mapa (estilo Airbnb).
  const [activeId, setActiveId] = useState<string | null>(null);

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
    <main className="mx-auto max-w-[1600px] px-6 pb-20 pt-20 sm:px-12 md:pt-24">
      <header className="space-y-4">
        {/* Toggle Lista/Mapa solo en tablet (md); en móvil lo cubre el FAB y en lg+ el split. */}
        <div className="hidden justify-end md:flex lg:hidden">
          <ViewToggle
            value={filtros.view}
            onChange={(v) => setFiltros({ view: v })}
          />
        </div>

        <WhereSearch
          universidadId={filtros.universidadId}
          zonaId={filtros.zonaId}
          zonaTexto={filtros.zona}
          ordenCercania={filtros.orden === 'cercania'}
          onSelectUniversidad={(universidadId, zonaId) => setFiltros({ universidadId, zonaId })}
          onSelectTexto={(zona) => setFiltros({ zona: zona || undefined })}
          onCercaDeMi={() => handleOrden('cercania')}
          defaultUniversidadNombre={uniEstudiante}
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
            onChange={handleOrden}
          />
        </div>

        <FilterChips
          filtros={filtros}
          setFiltros={setFiltros}
          limpiarTodo={limpiarFiltros}
        />
      </header>

      {/* Split estilo Airbnb: en desktop la columna de cards tiene SU PROPIO scroll y el
          mapa queda fijo a pantalla completa (no depende de sticky → funciona con pocas o
          muchas tarjetas). En móvil/tablet el toggle muestra uno u otro y la página scrollea. */}
      <section className="mt-6 lg:grid lg:grid-cols-[1fr_minmax(0,44%)] lg:gap-6 lg:h-[calc(100vh-14rem)]">
        <div
          className={cn(
            'lg:h-full lg:overflow-y-auto lg:pr-1',
            filtros.view === 'mapa' ? 'hidden lg:block' : 'block',
          )}
        >
          <ResultsGrid
            items={items}
            cargando={cargando}
            cargandoMas={cargandoMas}
            hasMore={hasMore}
            error={error}
            onCargarMas={cargarMas}
            onReintentar={reintentar}
            onLimpiarFiltros={limpiarFiltros}
            gridClassName="grid grid-cols-1 gap-5 sm:grid-cols-2"
            activeId={activeId}
            onHover={setActiveId}
          />
        </div>

        <div
          className={cn(
            'overflow-hidden rounded-2xl lg:h-full',
            filtros.view === 'mapa' ? 'h-[72vh]' : 'hidden lg:block',
          )}
        >
          <MapResults
            propiedades={items}
            className="h-full"
            activeId={activeId}
            onHover={setActiveId}
          />
        </div>
      </section>

      <ViewToggle
        variant="fab"
        value={filtros.view}
        onChange={(v) => setFiltros({ view: v })}
      />
    </main>
  );
}
