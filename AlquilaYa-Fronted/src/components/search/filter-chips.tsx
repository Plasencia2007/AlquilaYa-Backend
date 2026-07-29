'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { BadgeCheck, ImageIcon, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Filtros } from '@/schemas/search-schema';
import { universidadService, type Universidad } from '@/services/universidad-service';

const TIPO_LABELS: Record<string, string> = {
  CUARTO_INDIVIDUAL: 'Cuarto individual',
  CUARTO_COMPARTIDO: 'Cuarto compartido',
  DEPARTAMENTO: 'Departamento',
  MINI_DEPA: 'Mini depa',
  CASA: 'Casa',
  SUITE: 'Suite',
};

// Etiqueta legible de cada servicio (clave del catálogo → texto). Si no está mapeado,
// se muestra la clave tal cual (fallback seguro).
const SERVICIO_LABELS: Record<string, string> = {
  WIFI: 'Wi-Fi',
  LUZ: 'Luz',
  AGUA: 'Agua',
  GAS: 'Gas',
  CABLE_TV: 'Cable TV',
  LAVANDERIA: 'Lavandería',
  COCINA_COMPARTIDA: 'Cocina compartida',
  ESTACIONAMIENTO: 'Estacionamiento',
  SEGURIDAD_24H: 'Seguridad 24h',
};

interface Chip {
  key: string;
  label: string;
  icon?: ReactNode;
  onClear: () => void;
}

interface Props {
  filtros: Filtros;
  setFiltros: (next: Partial<Filtros>) => void;
  limpiarTodo: () => void;
  className?: string;
}

/**
 * Barra de chips de filtros activos (ítem 122). Deriva EXHAUSTIVAMENTE un chip por cada
 * filtro presente en el objeto `filtros` (texto libre, universidad/zona del catálogo, precio,
 * tipo, servicios, capacidad, dormitorios, calificación, distancia y los toggles de calidad),
 * cada uno con su botón de quitar individual, más un "Limpiar todo".
 *
 * Los nombres de universidad/zona (que en la URL son solo IDs) se resuelven contra el catálogo
 * público; mientras carga se muestra una etiqueta genérica pero igualmente removible.
 */
export function FilterChips({ filtros, setFiltros, limpiarTodo, className }: Props) {
  const [universidades, setUniversidades] = useState<Universidad[]>([]);

  // Resuelve los NOMBRES de universidad/zona (la URL solo trae IDs). Solo consulta el
  // catálogo si hay una universidad seleccionada. setState va dentro del `.then` (async),
  // no en el cuerpo del efecto — no dispara `react-hooks/set-state-in-effect`.
  useEffect(() => {
    if (filtros.universidadId == null) return;
    let cancel = false;
    universidadService
      .listarActivas()
      .then((data) => {
        if (!cancel) setUniversidades(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [filtros.universidadId]);

  const uni = universidades.find((u) => u.id === filtros.universidadId);
  const zonaCat = uni?.zonas?.find((z) => z.id === filtros.zonaId);

  const chips: Chip[] = [];

  // Texto libre `q` (ítem 126).
  if (filtros.q && filtros.q.trim()) {
    chips.push({
      key: 'q',
      label: `"${filtros.q.trim()}"`,
      icon: <Search className="size-3.5 text-muted-foreground" aria-hidden />,
      onClear: () => setFiltros({ q: undefined }),
    });
  }
  // Universidad (catálogo). Al quitarla también se limpia la zona (pertenece a ella).
  if (filtros.universidadId != null) {
    chips.push({
      key: 'universidad',
      label: uni?.nombre ?? 'Universidad',
      onClear: () => setFiltros({ universidadId: undefined, zonaId: undefined }),
    });
  }
  // Zona de cobertura (catálogo), distinta del texto libre `zona`.
  if (filtros.zonaId != null) {
    chips.push({
      key: 'zonaId',
      label: zonaCat?.nombre ?? 'Zona del campus',
      onClear: () => setFiltros({ zonaId: undefined }),
    });
  }
  if (filtros.zona) {
    chips.push({
      key: 'zona',
      label: `Zona: ${filtros.zona}`,
      onClear: () => setFiltros({ zona: undefined }),
    });
  }
  if (filtros.tipo) {
    chips.push({
      key: 'tipo',
      label: TIPO_LABELS[filtros.tipo] ?? filtros.tipo,
      onClear: () => setFiltros({ tipo: undefined }),
    });
  }
  if (typeof filtros.precioMin === 'number' || typeof filtros.precioMax === 'number') {
    const min = filtros.precioMin ?? '–';
    const max = filtros.precioMax ?? '–';
    chips.push({
      key: 'precio',
      label: `S/ ${min} – ${max}`,
      onClear: () => setFiltros({ precioMin: undefined, precioMax: undefined }),
    });
  }
  if (typeof filtros.distanciaMaxKm === 'number') {
    chips.push({
      key: 'distancia',
      label: `≤ ${filtros.distanciaMaxKm} km de UPeU`,
      onClear: () => setFiltros({ distanciaMaxKm: undefined }),
    });
  }
  if (typeof filtros.calificacionMin === 'number' && filtros.calificacionMin > 0) {
    chips.push({
      key: 'calificacion',
      label: `★ ${filtros.calificacionMin}+`,
      onClear: () => setFiltros({ calificacionMin: undefined }),
    });
  }
  if (typeof filtros.capacidadMin === 'number' && filtros.capacidadMin > 0) {
    chips.push({
      key: 'capacidad',
      label: `${filtros.capacidadMin}+ personas`,
      onClear: () => setFiltros({ capacidadMin: undefined }),
    });
  }
  if (typeof filtros.dormitoriosMin === 'number' && filtros.dormitoriosMin > 0) {
    chips.push({
      key: 'dormitorios',
      label: `${filtros.dormitoriosMin}+ dorm.`,
      onClear: () => setFiltros({ dormitoriosMin: undefined }),
    });
  }
  for (const s of filtros.servicios) {
    chips.push({
      key: `servicio-${s}`,
      label: SERVICIO_LABELS[s] ?? s,
      onClear: () =>
        setFiltros({
          servicios: filtros.servicios.filter((x) => x !== s),
        }),
    });
  }
  // Toggles de calidad (ítem 125).
  if (filtros.soloVerificados === true) {
    chips.push({
      key: 'soloVerificados',
      label: 'Solo verificados',
      icon: <BadgeCheck className="size-3.5 text-muted-foreground" aria-hidden />,
      onClear: () => setFiltros({ soloVerificados: undefined }),
    });
  }
  if (filtros.soloConFotos === true) {
    chips.push({
      key: 'soloConFotos',
      label: 'Solo con fotos',
      icon: <ImageIcon className="size-3.5 text-muted-foreground" aria-hidden />,
      onClear: () => setFiltros({ soloConFotos: undefined }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/5"
          aria-label={`Quitar filtro ${chip.label}`}
        >
          {chip.icon}
          {chip.label}
          <X className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
        </button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={limpiarTodo}
        className="h-7 px-3 text-xs font-bold text-muted-foreground hover:text-primary"
      >
        Limpiar todo
      </Button>
    </div>
  );
}
