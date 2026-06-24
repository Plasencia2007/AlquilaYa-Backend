/** Nivel de reputación derivado del score agregado (#26). Espejo del enum del backend. */
export type NivelReputacion = 'BRONCE' | 'PLATA' | 'ORO' | 'PLATINO';

export interface NivelMeta {
  label: string;
  emoji: string;
  /** clases Tailwind para el chip (fondo + texto + borde). */
  className: string;
}

const META: Record<NivelReputacion, NivelMeta> = {
  BRONCE: {
    label: 'Bronce',
    emoji: '🥉',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  PLATA: {
    label: 'Plata',
    emoji: '🥈',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  ORO: {
    label: 'Oro',
    emoji: '🥇',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  PLATINO: {
    label: 'Platino',
    emoji: '💎',
    className: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  },
};

export function metaNivelReputacion(nivel: NivelReputacion): NivelMeta {
  return META[nivel] ?? META.BRONCE;
}
