import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  type LucideIcon,
  XCircle,
} from 'lucide-react';

import type { EstadoReserva } from '@/types/reserva';

export interface EstadoMeta {
  label: string;
  bg: string; // tailwind class
  text: string; // tailwind class
  border: string;
  icon: LucideIcon;
}

const META: Record<EstadoReserva, EstadoMeta> = {
  SOLICITADA: {
    label: 'Pendiente',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: Clock,
  },
  APROBADA: {
    label: 'Aprobada · paga ahora',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: CreditCard,
  },
  RECHAZADA: {
    label: 'Rechazada',
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: XCircle,
  },
  PAGADA: {
    label: 'Confirmada',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  FINALIZADA: {
    label: 'Finalizada',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: CalendarCheck,
  },
  CANCELADA: {
    label: 'Cancelada',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
    icon: XCircle,
  },
};

export function metaEstadoReserva(estado: EstadoReserva): EstadoMeta {
  return META[estado] ?? META.SOLICITADA;
}

/**
 * Pasos del timeline visual. Cada estado avanza marcando algunos como completados.
 * Devuelve `{titulo, completado, activo}` por cada paso.
 */
export interface PasoTimeline {
  titulo: string;
  descripcion: string;
  completado: boolean;
  activo: boolean;
}

export function pasosTimeline(estado: EstadoReserva): PasoTimeline[] {
  const pasos = [
    { titulo: 'Solicitud enviada', descripcion: 'El arrendador la revisará pronto.' },
    { titulo: 'Aprobación', descripcion: 'El arrendador acepta tu reserva.' },
    { titulo: 'Pago', descripcion: 'Pagas el primer mes para confirmar.' },
    { titulo: 'Confirmada', descripcion: '¡Listo! Te puedes mudar.' },
  ];

  let idxActivo = 0;
  if (estado === 'APROBADA') idxActivo = 2;
  else if (estado === 'PAGADA') idxActivo = 3;
  else if (estado === 'FINALIZADA') idxActivo = 3;

  if (estado === 'RECHAZADA' || estado === 'CANCELADA') {
    return [
      { ...pasos[0], completado: true, activo: false },
      { ...pasos[1], completado: false, activo: true },
      { ...pasos[2], completado: false, activo: false },
      { ...pasos[3], completado: false, activo: false },
    ];
  }

  return pasos.map((p, i) => ({
    ...p,
    completado: i < idxActivo,
    activo: i === idxActivo,
  }));
}
