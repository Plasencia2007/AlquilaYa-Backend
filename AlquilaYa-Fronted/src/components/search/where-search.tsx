'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Clock, MapPin, Navigation, School, Search, X } from 'lucide-react';

import { universidadService, type Universidad } from '@/services/universidad-service';
import { useRecentSearchesStore } from '@/stores/recent-searches-store';
import { cn } from '@/lib/cn';

interface Props {
  universidadId?: number;
  zonaId?: number;
  zonaTexto?: string;
  ordenCercania?: boolean;
  onSelectUniversidad: (universidadId?: number, zonaId?: number) => void;
  onSelectTexto: (texto: string) => void;
  onCercaDeMi: () => void;
  /** Universidad del estudiante logueado: se preselecciona una vez. */
  defaultUniversidadNombre?: string;
}

/**
 * Buscador "¿Dónde estudias?" estilo Airbnb: un pill compacto que al hacer click se EXPANDE
 * con una transición suave (entrada + salida) y un backdrop, mostrando el panel de sugerencias
 * (Cerca de mí + universidades + zonas) y búsqueda por texto. Unifica el input y los 2 selects.
 */
export function WhereSearch({
  universidadId,
  zonaId,
  zonaTexto,
  ordenCercania,
  onSelectUniversidad,
  onSelectTexto,
  onCercaDeMi,
  defaultUniversidadNombre,
}: Props) {
  const [universidades, setUniversidades] = useState<Universidad[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [texto, setTexto] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultAplicado = useRef(false);

  // Búsquedas recientes (ítem 113): persistidas en localStorage con hidratación manual.
  const recientes = useRecentSearchesStore((s) => s.recientes);
  const registrarReciente = useRecentSearchesStore((s) => s.registrar);
  const eliminarReciente = useRecentSearchesStore((s) => s.eliminar);
  const limpiarRecientes = useRecentSearchesStore((s) => s.limpiar);

  useEffect(() => {
    void useRecentSearchesStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    let cancel = false;
    universidadService
      .listarActivas()
      .then((d) => { if (!cancel) setUniversidades(Array.isArray(d) ? d : []); })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  // Preselección de la universidad del estudiante logueado (una vez, sin pisar la URL).
  useEffect(() => {
    if (defaultAplicado.current || universidades.length === 0) return;
    if (universidadId != null) { defaultAplicado.current = true; return; }
    const nombre = defaultUniversidadNombre?.trim().toLowerCase();
    if (!nombre) return;
    const match = universidades.find((u) => u.nombre.trim().toLowerCase() === nombre);
    if (match) {
      defaultAplicado.current = true;
      onSelectUniversidad(match.id, undefined);
    }
  }, [universidades, universidadId, defaultUniversidadNombre, onSelectUniversidad]);

  // Cierre animado: reproduce la animación de salida y luego desmonta.
  const cerrar = useCallback(() => {
    setCerrando(true);
    window.setTimeout(() => {
      setAbierto(false);
      setCerrando(false);
    }, 160);
  }, []);

  const abrir = () => {
    setCerrando(false);
    setAbierto(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  // Cerrar al hacer click fuera.
  useEffect(() => {
    if (!abierto) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cerrar();
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [abierto, cerrar]);

  // Etiqueta del pill según la selección activa (la selección manda sobre "Cerca de mí").
  const uniActual = universidades.find((u) => u.id === universidadId);
  const zonaActual = uniActual?.zonas?.find((z) => z.id === zonaId);
  const etiqueta = zonaActual
    ? `${zonaActual.nombre} · ${uniActual?.nombre ?? ''}`
    : uniActual
      ? uniActual.nombre
      : zonaTexto && zonaTexto.trim()
        ? zonaTexto
        : ordenCercania
          ? 'Cerca de mí'
          : '';

  const q = texto.trim().toLowerCase();
  const universidadesFiltradas = useMemo(() => {
    if (!q) return universidades;
    return universidades
      .map((u) => {
        const uniMatch = u.nombre.toLowerCase().includes(q);
        const zonas = (u.zonas ?? []).filter((z) => z.nombre.toLowerCase().includes(q));
        if (uniMatch) return u;
        if (zonas.length > 0) return { ...u, zonas };
        return null;
      })
      .filter((u): u is Universidad => u !== null);
  }, [universidades, q]);

  const seleccionarUni = (uId?: number, zId?: number) => {
    onSelectUniversidad(uId, zId);
    setTexto('');
    cerrar();
  };

  const buscarTexto = () => {
    const t = texto.trim();
    if (t) registrarReciente(t);
    onSelectTexto(t);
    cerrar();
  };

  // Re-aplica una búsqueda reciente y la sube al tope por recencia.
  const usarReciente = (t: string) => {
    registrarReciente(t);
    setTexto('');
    onSelectTexto(t);
    cerrar();
  };

  const anim = cerrando
    ? 'animate-out fade-out-0 zoom-out-95 slide-out-to-top-2'
    : 'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2';

  return (
    <>
      {/* Backdrop que oscurece el resto cuando está expandido */}
      {abierto && (
        <div
          className={cn(
            'fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] duration-200',
            cerrando ? 'animate-out fade-out-0' : 'animate-in fade-in-0',
          )}
          onClick={cerrar}
          aria-hidden
        />
      )}

      <div ref={ref} className="relative z-40 mx-auto w-full max-w-2xl">
        {/* Pill: se "eleva" al abrir */}
        <button
          type="button"
          onClick={() => (abierto ? cerrar() : abrir())}
          className={cn(
            'flex w-full items-center gap-3 rounded-full border bg-card px-5 py-3 text-left transition-all duration-200',
            abierto
              ? 'scale-[1.01] border-primary/40 shadow-xl ring-2 ring-primary/15'
              : 'border-border shadow-sm hover:shadow-md',
          )}
        >
          <Search className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              ¿Dónde estudias?
            </span>
            <span className="block truncate text-sm font-semibold text-foreground">
              {etiqueta || 'Busca por universidad, zona o nombre'}
            </span>
          </span>
          {etiqueta && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                seleccionarUni(undefined, undefined);
                onSelectTexto('');
              }}
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Limpiar"
            >
              <X className="size-4" />
            </span>
          )}
        </button>

        {/* Panel de sugerencias con transición de apertura/cierre */}
        {abierto && (
          <div
            className={cn(
              'absolute left-0 right-0 z-40 mt-3 max-h-[70vh] origin-top overflow-y-auto rounded-3xl border border-border bg-card p-3 shadow-2xl duration-200',
              anim,
            )}
          >
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarTexto()}
                placeholder="Busca por zona, distrito o nombre…"
                className="h-11 w-full rounded-xl border border-border bg-input pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Búsquedas recientes: solo cuando no se está tecleando (ítem 113) */}
            {!q && recientes.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center justify-between px-2 pb-1 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Recientes
                  </p>
                  <button
                    type="button"
                    onClick={limpiarRecientes}
                    className="text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Borrar
                  </button>
                </div>
                {recientes.map((r) => (
                  <div key={r.texto} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => usarReciente(r.texto)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-muted"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
                        <Clock className="size-4 text-muted-foreground" />
                      </span>
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                        {r.texto}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Quitar "${r.texto}" de recientes`}
                      onClick={() => eliminarReciente(r.texto)}
                      className="shrink-0 rounded-full p-2 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Sugerencias
            </p>

            <SugRow
              icon={<Navigation className="size-5 text-primary" />}
              title="Cerca de mí"
              subtitle="Descubre los cuartos a tu alrededor"
              onClick={() => {
                onCercaDeMi();
                cerrar();
              }}
            />

            <SugRow
              icon={<MapPin className="size-5 text-muted-foreground" />}
              title="Todas las universidades"
              subtitle="Ver todos los cuartos disponibles"
              onClick={() => seleccionarUni(undefined, undefined)}
            />

            {universidadesFiltradas.map((u) => {
              const zonas = (u.zonas ?? []).filter((z) => z.activo && z.id != null);
              return (
                <div key={u.id}>
                  <SugRow
                    icon={<School className="size-5 text-primary" />}
                    title={u.nombre}
                    subtitle="Cuartos cerca del campus"
                    active={u.id === universidadId && zonaId == null && !ordenCercania}
                    onClick={() => seleccionarUni(u.id, undefined)}
                  />
                  {zonas.map((z) => (
                    <SugRow
                      key={z.id}
                      indent
                      icon={<MapPin className="size-4 text-muted-foreground" />}
                      title={z.nombre}
                      subtitle={`Zona de ${u.nombre}`}
                      active={z.id === zonaId}
                      onClick={() => seleccionarUni(u.id, z.id)}
                    />
                  ))}
                </div>
              );
            })}

            {universidadesFiltradas.length === 0 && (
              <button
                type="button"
                onClick={buscarTexto}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-muted"
              >
                <Search className="size-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Buscar “{texto}”</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function SugRow({
  icon,
  title,
  subtitle,
  onClick,
  active,
  indent,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  active?: boolean;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-muted',
        active && 'bg-primary/5',
        indent && 'pl-8',
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
