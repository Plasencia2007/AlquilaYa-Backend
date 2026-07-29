'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Sparkles, X } from 'lucide-react';

import { WhereSearch } from '@/components/search/where-search';
import { FilterChips } from '@/components/search/filter-chips';
import { FiltersSheet } from '@/components/search/filters-sheet';
import { ViewToggle } from '@/components/search/view-toggle';
import { SortDropdown } from '@/components/search/sort-dropdown';
import { NavbarBrand } from '@/components/layout/navbar-brand';
import { NavbarAuthActions } from '@/components/layout/navbar-auth-actions';
import { ResultsGrid } from '@/components/search/results-grid';
import { MapResults } from '@/components/search/map-results';
import { useSearchParamsState } from '@/hooks/use-search-params-state';
import { usePropertiesSearch, type CentroBusqueda } from '@/hooks/use-properties-search';
import { useAuth } from '@/hooks/use-auth';
import { studentProfileService } from '@/services/student-profile-service';
import { universidadService, type Universidad } from '@/services/universidad-service';
import {
  useSearchPreferencesStore,
  UMBRAL_REPETICION_PREFERENCIAS,
} from '@/stores/search-preferences-store';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { getCampusAnchor, getCampusRadioMaxKm } from '@/lib/geo';
import { parseFiltros, serializarFiltros } from '@/lib/search-url';
import { resolverContextoBusqueda } from '@/lib/search-context';
import { firmaFiltros } from '@/lib/search-preferences';
import {
  aplicarScroll,
  guardarScrollPos,
  leerScrollActual,
  leerScrollPos,
} from '@/lib/scroll-restore';
import type { Orden } from '@/schemas/search-schema';

export function SearchClient() {
  const { filtros, setFiltros, limpiarFiltros } = useSearchParamsState();

  // Ancla de proximidad (geolocalización "Cerca de mí" o centro+radio de un área del mapa).
  // Fuera de la URL. Cuando está presente, el hook busca vía /buscar/cerca (distancia real).
  // ── PARA EL AGENTE DEL MAPA (wave 2): para "buscar en esta zona" (ítem 116), llama a
  //    `setCentroBusqueda({ lat, lng, radioKm })` con el centro/radio del viewport del mapa;
  //    la búsqueda se re-dispara sola (el hook depende de este valor). Para volver al listado
  //    normal, `setCentroBusqueda(null)`.
  const [centroBusqueda, setCentroBusqueda] = useState<CentroBusqueda | null>(null);

  // Modo "explorar sin ubicación exacta" (ítem 140): cuando el usuario NIEGA la geolocalización,
  // anclamos las distancias al campus y mostramos un banner suave con opción de reintentar.
  const [bannerCampus, setBannerCampus] = useState(false);

  // Propiedad resaltada (hoveredId, ítem 117): sincroniza hover entre el grid y el mapa (estilo
  // Airbnb). ── PARA EL AGENTE DEL MAPA: se pasa a <MapResults> como `activeId` (id resaltado) y
  //    `onHover` (setter). El grid ya lo emite en mouseenter/leave de cada card.
  const [activeId, setActiveId] = useState<string | null>(null);

  const {
    items,
    total,
    hasMore,
    cargando,
    cargandoMas,
    error,
    sugerencia,
    cargarMas,
    reintentar,
  } = usePropertiesSearch(filtros, centroBusqueda);

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

  // Catálogo de universidades: nombres para el contador con contexto (ítem 123) y el banner
  // de campus (ítem 140). Endpoint público; una sola carga.
  const [universidades, setUniversidades] = useState<Universidad[]>([]);
  useEffect(() => {
    let cancel = false;
    universidadService
      .listarActivas()
      .then((d) => { if (!cancel) setUniversidades(Array.isArray(d) ? d : []); })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  // ── Contador de resultados con contexto (ítem 123) ──
  const contexto = useMemo(
    () =>
      resolverContextoBusqueda(filtros, universidades, {
        // "cerca de ti" solo con geolocalización real (no en el fallback al campus).
        cercaDeMi: !!centroBusqueda && filtros.orden === 'cercania' && !bannerCampus,
      }),
    [filtros, universidades, centroBusqueda, bannerCampus],
  );

  // Nombre del campus para el banner "explorar sin ubicación" (ítem 140).
  const nombreCampus = useMemo(() => {
    const uSel = universidades.find((u) => u.id === filtros.universidadId);
    if (uSel) return uSel.nombre;
    const principal = universidades.find((u) => u.esPrincipal);
    return principal?.nombre ?? 'tu universidad';
  }, [universidades, filtros.universidadId]);

  // ── Guardar filtros como preferencia (ítem 137) ──
  const [prefsHidratado, setPrefsHidratado] = useState(false);
  const registrarBusqueda = useSearchPreferencesStore((s) => s.registrarBusqueda);
  const guardarPreferencias = useSearchPreferencesStore((s) => s.guardarPreferencias);
  const descartarOferta = useSearchPreferencesStore((s) => s.descartarOferta);
  const firmasRecientes = useSearchPreferencesStore((s) => s.firmasRecientes);
  const preferencias = useSearchPreferencesStore((s) => s.preferencias);
  const ofertaDescartada = useSearchPreferencesStore((s) => s.ofertaDescartada);

  const firma = useMemo(() => firmaFiltros(filtros), [filtros]);
  const queryActual = useMemo(() => serializarFiltros(filtros), [filtros]);

  // Hidrata el store (skipHydration) y, si la URL llega SIN filtros, aplica las
  // preferencias guardadas por defecto (una sola vez, al montar).
  const aplicadoPrefRef = useRef(false);
  useEffect(() => {
    let cancel = false;
    void useSearchPreferencesStore.persist.rehydrate()?.then(() => {
      if (cancel) return;
      setPrefsHidratado(true);
      if (aplicadoPrefRef.current) return;
      aplicadoPrefRef.current = true;
      const pref = useSearchPreferencesStore.getState().preferencias;
      // `serializarFiltros(filtros) === ''` == "sin filtros en la URL" (snapshot del montaje).
      if (pref && serializarFiltros(filtros) === '') {
        setFiltros(parseFiltros(new URLSearchParams(pref)));
      }
    });
    return () => { cancel = true; };
    // Solo al montar: usa el snapshot inicial de filtros/URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registra cada búsqueda con firma no vacía para detectar repetición (tras hidratar).
  useEffect(() => {
    if (!prefsHidratado || !firma) return;
    registrarBusqueda(firma);
  }, [prefsHidratado, firma, registrarBusqueda]);

  const conteoFirmaActual = useMemo(
    () => (firma ? firmasRecientes.filter((r) => r.firma === firma).length : 0),
    [firma, firmasRecientes],
  );

  const mostrarOfertaPref =
    prefsHidratado &&
    !!firma &&
    conteoFirmaActual >= UMBRAL_REPETICION_PREFERENCIAS &&
    !ofertaDescartada &&
    preferencias !== queryActual;

  const aceptarPreferencias = () => {
    guardarPreferencias(queryActual);
    notify.success('Preferencias guardadas', 'Las aplicaremos en tus próximas búsquedas.');
  };

  // ── Restaurar scroll al volver del detalle (ítem 129) ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollKey = queryActual; // keyed por la URL de búsqueda canónica

  // Guarda la posición (throttle con rAF) del scroller activo (columna en desktop / window).
  useEffect(() => {
    const el = scrollRef.current;
    let raf = 0;
    const save = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => guardarScrollPos(scrollKey, leerScrollActual(el)));
    };
    el?.addEventListener('scroll', save, { passive: true });
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el?.removeEventListener('scroll', save);
      window.removeEventListener('scroll', save);
    };
  }, [scrollKey]);

  // Restaura una sola vez por clave, cuando ya hay contenido montado (scroll es sync con el DOM).
  const restauradoKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (cargando) return;
    if (restauradoKeyRef.current === scrollKey) return;
    restauradoKeyRef.current = scrollKey;
    const saved = leerScrollPos(scrollKey);
    if (saved == null || saved <= 0) return;
    const el = scrollRef.current;
    // Doble rAF: espera al layout de las cards antes de fijar la posición.
    requestAnimationFrame(() => requestAnimationFrame(() => aplicarScroll(el, saved)));
  }, [cargando, scrollKey]);

  // Pide la geolocalización. Si se concede, ordena por cercanía a ti. Si se NIEGA (ítem 140),
  // ancla al campus y muestra el banner suave en vez de solo un toast de error.
  const pedirUbicacion = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      notify.error('Tu navegador no soporta geolocalización.', 'No disponible');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCentroBusqueda({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFiltros({ orden: 'cercania' });
        setBannerCampus(false);
      },
      () => {
        // Fallback elegante: distancias desde el campus + banner con opción de reintentar.
        const campus = getCampusAnchor();
        setCentroBusqueda({ lat: campus.lat, lng: campus.lng, radioKm: getCampusRadioMaxKm() });
        setFiltros({ orden: 'cercania' });
        setBannerCampus(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // "Cerca de mí" pide geolocalización (opcional). Cualquier otro orden limpia las coordenadas.
  const handleOrden = (orden: Orden) => {
    if (orden === 'cercania') {
      pedirUbicacion();
      return;
    }
    // Cualquier otro orden abandona la búsqueda por proximidad y vuelve al listado normal.
    setCentroBusqueda(null);
    setBannerCampus(false);
    setFiltros({ orden });
  };

  return (
    <>
      {/* ── NAVBAR de búsqueda (reemplaza al TopBar en /search) ── */}
      <header className="fixed top-0 z-50 w-full border-b border-primary/10 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-3 sm:px-12">

          <NavbarBrand />

          {/* Centro: buscador + filtros juntos */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
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
            </div>
            <FiltersSheet
              filtros={filtros}
              onApply={(next) => setFiltros(next)}
              onClear={limpiarFiltros}
              total={total}
            />
          </div>

          {/* Derecha: toggle + auth */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden md:flex lg:hidden">
              <ViewToggle value={filtros.view} onChange={(v) => setFiltros({ view: v })} />
            </div>
            <NavbarAuthActions hideLoginOnMobile={false} />
          </div>
        </div>

        {/* Chips de filtros activos */}
        <div className="mx-auto max-w-[1600px] px-6 pb-2 sm:px-12">
          <FilterChips filtros={filtros} setFiltros={setFiltros} limpiarTodo={limpiarFiltros} />
        </div>
      </header>

    <main className="mx-auto max-w-[1600px] px-6 pb-20 pt-32 sm:px-12">

      {/* Ítem 403: la búsqueda no tenía NINGÚN <h1> — el título de página vive en
          `metadata.title` (`search/page.tsx`, "Buscar cuartos · AlquilaYa") pero eso no
          sustituye el encabezado de contenido que necesita un lector de pantalla. Visualmente
          el "título" de esta pantalla ya lo comunica el buscador (WhereSearch) + los filtros,
          así que va oculto (sr-only) en vez de duplicar texto visible. */}
      <h1 className="sr-only">Buscar cuartos</h1>

      {/* Barra de resultados: contador CON CONTEXTO (ítem 123) + selector de orden (?orden=). */}
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-sm font-semibold text-foreground sm:text-base"
          aria-live="polite"
          aria-atomic="true"
        >
          {cargando
            ? 'Buscando cuartos…'
            : `${total} ${total === 1 ? 'cuarto' : 'cuartos'}${contexto ? ` ${contexto}` : ''}`}
        </p>
        <SortDropdown value={filtros.orden} onChange={handleOrden} />
      </div>

      {/* Oferta de guardar filtros como preferencia (ítem 137): discreta y descartable. */}
      {mostrarOfertaPref && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-foreground">
            Repites esta búsqueda seguido. ¿Guardarla como tus preferencias por defecto?
          </p>
          <button
            type="button"
            onClick={aceptarPreferencias}
            className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={descartarOferta}
            aria-label="Descartar"
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Modo "explorar sin ubicación exacta" (ítem 140): ancla al campus + reintentar. */}
      {bannerCampus && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
          <MapPin className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-foreground">
            Mostrando distancias desde {nombreCampus} — activa tu ubicación para personalizarlas.
          </p>
          <button
            type="button"
            onClick={pedirUbicacion}
            className="shrink-0 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Activar ubicación
          </button>
          <button
            type="button"
            onClick={() => setBannerCampus(false)}
            aria-label="Cerrar"
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Split estilo Airbnb: en desktop la columna de cards tiene SU PROPIO scroll y el
          mapa queda fijo a pantalla completa (no depende de sticky → funciona con pocas o
          muchas tarjetas). En móvil/tablet el toggle muestra uno u otro y la página scrollea. */}
      <section className="mt-6 lg:grid lg:grid-cols-[1fr_minmax(0,44%)] lg:gap-6 lg:h-[calc(100vh-14rem)]">
        <div
          ref={scrollRef}
          id="resultados-busqueda"
          tabIndex={-1}
          aria-label="Resultados de búsqueda"
          className={cn(
            'scroll-mt-24 outline-none lg:h-full lg:overflow-y-auto lg:pr-1',
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
            gridClassName="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2"
            activeId={activeId}
            onHover={setActiveId}
            sugerencia={sugerencia}
            onAplicarSugerencia={(patch) => setFiltros(patch)}
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
            setCentroBusqueda={setCentroBusqueda}
          />
        </div>
      </section>

      <ViewToggle
        variant="fab"
        value={filtros.view}
        onChange={(v) => setFiltros({ view: v })}
      />
    </main>
    </>
  );
}
