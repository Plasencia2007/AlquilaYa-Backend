'use client';

import { ArrowUpDown } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Orden } from '@/schemas/search-schema';

const LABELS: Record<Orden, string> = {
  distancia: 'Más cercanos a UPeU',
  precio: 'Precio: menor a mayor',
  calificacion: 'Mejor calificados',
};

interface Props {
  value: Orden;
  onChange: (orden: Orden) => void;
}

export function SortDropdown({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Orden)}>
      <SelectTrigger
        className="h-10 w-auto min-w-[200px] gap-2 rounded-full border-border bg-card text-sm font-semibold shadow-sm"
        aria-label="Ordenar resultados"
      >
        <ArrowUpDown className="size-4 text-muted-foreground" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="distancia">{LABELS.distancia}</SelectItem>
        <SelectItem value="precio">{LABELS.precio}</SelectItem>
        <SelectItem value="calificacion">{LABELS.calificacion}</SelectItem>
      </SelectContent>
    </Select>
  );
}
