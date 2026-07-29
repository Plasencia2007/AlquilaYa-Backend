import type { Filtros } from '@/schemas/search-schema';

/**
 * Firma estable de los filtros "de contenido" para detectar búsquedas repetidas
 * (ítem 137). Ignora `orden` y `view` (preferencias de presentación, no del rango
 * buscado). Si no hay ningún filtro activo devuelve '' → no se ofrece guardar
 * "todos los cuartos" como preferencia.
 */
export function firmaFiltros(f: Filtros): string {
  const parts: string[] = [];
  if (f.zona && f.zona.trim()) parts.push(`z:${f.zona.trim().toLowerCase()}`);
  if (typeof f.precioMin === 'number') parts.push(`pmin:${f.precioMin}`);
  if (typeof f.precioMax === 'number') parts.push(`pmax:${f.precioMax}`);
  if (f.tipo) parts.push(`tipo:${f.tipo}`);
  if (f.servicios && f.servicios.length > 0) parts.push(`serv:${[...f.servicios].sort().join('+')}`);
  if (typeof f.distanciaMaxKm === 'number') parts.push(`dist:${f.distanciaMaxKm}`);
  if (typeof f.calificacionMin === 'number' && f.calificacionMin > 0) parts.push(`cal:${f.calificacionMin}`);
  if (typeof f.universidadId === 'number') parts.push(`uni:${f.universidadId}`);
  if (typeof f.zonaId === 'number') parts.push(`zona:${f.zonaId}`);
  if (typeof f.capacidadMin === 'number' && f.capacidadMin > 0) parts.push(`cap:${f.capacidadMin}`);
  if (typeof f.dormitoriosMin === 'number' && f.dormitoriosMin > 0) parts.push(`dorm:${f.dormitoriosMin}`);
  return parts.join('|');
}
