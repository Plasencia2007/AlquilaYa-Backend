'use client';

import { useEffect, useRef, useState } from 'react';

import { universidadService, type Universidad } from '@/services/universidad-service';

const SELECT_CLASS =
  'h-10 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

interface Props {
  universidadId?: number;
  zonaId?: number;
  onChange: (next: { universidadId?: number; zonaId?: number }) => void;
  /** Nombre de la universidad del estudiante logueado: se preselecciona una sola vez. */
  defaultUniversidadNombre?: string;
}

/**
 * Selector de universidad y, si hay una elegida, su zona de cobertura. El estudiante
 * filtra por su campus; "Todas" deja sin filtrar (incluye propiedades aún sin zona).
 * Las opciones salen del catálogo (`/catalogos/universidades`, público).
 */
export function UniversidadZonaFilter({
  universidadId,
  zonaId,
  onChange,
  defaultUniversidadNombre,
}: Props) {
  const [universidades, setUniversidades] = useState<Universidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const defaultAplicado = useRef(false);

  useEffect(() => {
    let cancel = false;
    universidadService
      .listarActivas()
      .then((data) => { if (!cancel) setUniversidades(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (!cancel) setCargando(false); });
    return () => { cancel = true; };
  }, []);

  // Preselecciona la universidad del estudiante logueado una sola vez, si no hay
  // una elegida en la URL. No pisa una selección explícita del usuario.
  useEffect(() => {
    if (defaultAplicado.current || cargando || universidades.length === 0) return;
    if (universidadId != null) { defaultAplicado.current = true; return; }
    const nombre = defaultUniversidadNombre?.trim().toLowerCase();
    if (!nombre) return;
    const match = universidades.find((u) => u.nombre.trim().toLowerCase() === nombre);
    if (match) {
      defaultAplicado.current = true;
      onChange({ universidadId: match.id, zonaId: undefined });
    }
  }, [cargando, universidades, universidadId, defaultUniversidadNombre, onChange]);

  if (cargando) {
    return <div className="h-10 w-44 animate-pulse rounded-xl bg-muted" />;
  }
  if (universidades.length === 0) return null;

  const uniActual = universidades.find((u) => u.id === universidadId);
  const zonas = (uniActual?.zonas ?? []).filter((z) => z.activo && z.id != null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground material-symbols-outlined text-[18px]">
          school
        </span>
        <select
          aria-label="Universidad"
          value={universidadId ?? ''}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : undefined;
            // Al cambiar de universidad se limpia la zona (pertenece a la anterior).
            onChange({ universidadId: v, zonaId: undefined });
          }}
          className={`${SELECT_CLASS} pl-9`}
        >
          <option value="">Todas las universidades</option>
          {universidades.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
      </div>

      {universidadId && zonas.length > 0 && (
        <select
          aria-label="Zona"
          value={zonaId ?? ''}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : undefined;
            onChange({ universidadId, zonaId: v });
          }}
          className={SELECT_CLASS}
        >
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>{z.nombre}</option>
          ))}
        </select>
      )}
    </div>
  );
}
