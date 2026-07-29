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

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Calculadora de reembolso al cancelar (ítem 288). Traduce a lógica las reglas ya descritas en
 * `POLITICA_CANCELACION_INFO`: todas las políticas son "todo o nada" — reembolso completo si la
 * cancelación ocurre con al menos `diasMin` días de anticipación al check-in (`fechaInicio`), y
 * 0% en caso contrario. Para FLEXIBLE (`diasMin: 0`) esto equivale a "reembolso completo si
 * cancelas antes del check-in".
 *
 * Los días de anticipación se cuentan en días calendario completos (medianoche a medianoche),
 * ignorando la hora de `hoy` y de `fechaInicio`, para que el resultado no dependa de a qué hora
 * del día se abre el diálogo de cancelación.
 */
export function calcularReembolso(
  politica: PoliticaCancelacion,
  fechaInicio: string,
  hoy: Date,
  montoTotal: number,
): { porcentaje: number; monto: number } {
  const { diasMin } = POLITICA_CANCELACION_INFO[politica];
  const inicio = new Date(fechaInicio);
  const inicioUTC = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const diasAnticipacion = Math.floor((inicioUTC - hoyUTC) / MS_POR_DIA);

  const porcentaje = diasAnticipacion >= diasMin ? 100 : 0;
  const monto = Math.round(montoTotal * (porcentaje / 100) * 100) / 100;

  return { porcentaje, monto };
}
