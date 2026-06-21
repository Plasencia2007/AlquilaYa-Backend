import type { PoliticaCancelacion } from '@/types/propiedad';

/** Metadatos de cada política (debe coincidir con el enum del backend). */
export const POLITICA_CANCELACION_INFO: Record<
  PoliticaCancelacion,
  { label: string; diasMin: number; resumen: string; descripcion: string }
> = {
  FLEXIBLE: {
    label: 'Flexible',
    diasMin: 0,
    resumen: 'Reembolso completo antes del check-in.',
    descripcion: 'Si cancelas antes de la fecha de ingreso, te devolvemos el total.',
  },
  MODERADA: {
    label: 'Moderada',
    diasMin: 7,
    resumen: 'Reembolso si cancelas con 7+ días de anticipación.',
    descripcion:
      'Reembolso completo si cancelas al menos 7 días antes del check-in. Después de ese plazo, no hay reembolso.',
  },
  ESTRICTA: {
    label: 'Estricta',
    diasMin: 30,
    resumen: 'Reembolso solo si cancelas con 30+ días de anticipación.',
    descripcion:
      'Reembolso completo solo si cancelas al menos 30 días antes del check-in. Después de ese plazo, no hay reembolso.',
  },
};

export const POLITICAS_CANCELACION: PoliticaCancelacion[] = ['FLEXIBLE', 'MODERADA', 'ESTRICTA'];
