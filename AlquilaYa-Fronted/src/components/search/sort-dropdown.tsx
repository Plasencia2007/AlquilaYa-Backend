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
  distancia: 'Más cercanos al campus',
  cercania: 'Cerca de mí',
  precio: 'Precio: menor a mayor',
  precioDesc: 'Precio: mayor a menor',
  recientes: 'Más recientes',
  calificacion: 'Mejor calificados',
};

// Orden de aparición en el menú (Relevancia/proximidad primero, luego precio, novedad, rating).
const OPCIONES: Orden[] = ['distancia', 'cercania', 'precio', 'precioDesc', 'recientes', 'calificacion'];

interface Props {
  value: Orden;
  onChange: (orden: Orden) => void;
  className?: string;
}

export function SortDropdown({ value, onChange, className }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Orden)}>
      <SelectTrigger
        className={`h-10 w-auto min-w-[200px] gap-2 rounded-full border-border bg-card text-sm font-semibold shadow-sm ${className ?? ''}`}
        aria-label="Ordenar resultados"
      >
        <ArrowUpDown className="size-4 text-muted-foreground" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPCIONES.map((o) => (
          <SelectItem key={o} value={o}>
            {LABELS[o]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
