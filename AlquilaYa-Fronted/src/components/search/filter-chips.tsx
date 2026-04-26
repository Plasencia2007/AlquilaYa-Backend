'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Filtros } from '@/schemas/search-schema';

const TIPO_LABELS: Record<string, string> = {
  CUARTO: 'Cuarto',
  DEPARTAMENTO: 'Departamento',
  ESTUDIO: 'Estudio',
  CASA: 'Casa',
};

interface Chip {
  key: string;
  label: string;
  onClear: () => void;
}

interface Props {
  filtros: Filtros;
  setFiltros: (next: Partial<Filtros>) => void;
  limpiarTodo: () => void;
  className?: string;
}

export function FilterChips({ filtros, setFiltros, limpiarTodo, className }: Props) {
  const chips: Chip[] = [];

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
  for (const s of filtros.servicios) {
    chips.push({
      key: `servicio-${s}`,
      label: s,
      onClear: () =>
        setFiltros({
          servicios: filtros.servicios.filter((x) => x !== s),
        }),
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
