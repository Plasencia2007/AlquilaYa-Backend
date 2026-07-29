import type { Filtros } from '@/schemas/search-schema';

/**
 * Empty state inteligente con relajación de filtros (ítem 124).
 *
 * Cuando una búsqueda queda en 0 resultados, en vez de un callejón sin salida
 * detectamos el/los filtro(s) más restrictivos y proponemos relajarlos. Cada
 * candidato lleva el `patch` concreto (para aplicarlo con un click) y una función
 * `mensaje(conteo)` que se completa con el conteo alternativo REAL una vez que el
 * hook lo pre-calcula llamando a `servicioPropiedades` con los filtros relajados.
 */

export interface SugerenciaRelajacion {
  mensaje: string;
  patch: Partial<Filtros>;
}

export interface CandidatoRelajacion {
  /** clave estable (para React / debug). */
  id: string;
  /** patch a aplicar sobre `Filtros` para relajar este filtro. */
  patch: Partial<Filtros>;
  /** construye el mensaje una vez conocido el conteo alternativo. */
  mensaje: (conteo: number) => string;
}

const cuartos = (n: number) => `${n} ${n === 1 ? 'cuarto' : 'cuartos'}`;

/**
 * Identifica los filtros candidatos a relajar, del más restrictivo (y común) al
 * menos. El hook prueba solo los primeros 1-2 para no disparar N peticiones.
 * Orden heurístico: precio máx → calificación mín → distancia máx → servicios.
 */
export function candidatosRelajacion(filtros: Filtros): CandidatoRelajacion[] {
  const out: CandidatoRelajacion[] = [];

  // Precio máximo: ampliar ~33 %, redondeado a la decena de 50 superior.
  if (typeof filtros.precioMax === 'number') {
    const actual = filtros.precioMax;
    const nuevo = Math.max(actual + 50, Math.ceil((actual * 1.33) / 50) * 50);
    out.push({
      id: 'precioMax',
      patch: { precioMax: nuevo },
      mensaje: (n) =>
        `Sin resultados con precio ≤ S/${actual} — prueba hasta S/${nuevo} (${cuartos(n)})`,
    });
  }

  // Calificación mínima: quitar el filtro.
  if (typeof filtros.calificacionMin === 'number' && filtros.calificacionMin > 0) {
    const actual = filtros.calificacionMin;
    out.push({
      id: 'calificacionMin',
      patch: { calificacionMin: undefined },
      mensaje: (n) =>
        `Sin resultados con ${actual}+ estrellas — sin ese mínimo hay ${cuartos(n)}`,
    });
  }

  // Distancia máxima al campus: ampliar ~50 % (tope 50 km).
  if (typeof filtros.distanciaMaxKm === 'number') {
    const actual = filtros.distanciaMaxKm;
    const nuevo = Math.min(50, Math.max(actual + 1, Math.ceil(actual * 1.5)));
    out.push({
      id: 'distanciaMaxKm',
      patch: { distanciaMaxKm: nuevo },
      mensaje: (n) => `Sin resultados a ≤ ${actual} km — amplía a ${nuevo} km (${cuartos(n)})`,
    });
  }

  // Servicios (semántica AND): quitar la exigencia de todos.
  if (filtros.servicios && filtros.servicios.length > 0) {
    out.push({
      id: 'servicios',
      patch: { servicios: [] },
      mensaje: (n) => `Sin resultados con todos esos servicios — sin ese filtro hay ${cuartos(n)}`,
    });
  }

  return out;
}
