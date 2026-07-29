import type { Filtros } from '@/schemas/search-schema';
import type { Universidad } from '@/services/universidad-service';

/**
 * Contexto legible de la búsqueda para el contador de resultados (ítem 123):
 * "152 cuartos cerca de UPeU" / "12 cuartos en Ñaña" / "8 cuartos cerca de ti".
 *
 * Devuelve solo el sufijo ("cerca de UPeU", "en Ñaña", "cerca de ti") o '' si no
 * hay un ancla clara. Prioridad: texto de zona > zona del catálogo > universidad >
 * "cerca de ti" (geolocalización activa) > campus principal por defecto.
 */
export function resolverContextoBusqueda(
  filtros: Filtros,
  universidades: Universidad[],
  opts?: { cercaDeMi?: boolean },
): string {
  // Zona escrita a mano en "¿Dónde estudias?".
  if (filtros.zona && filtros.zona.trim()) return `en ${filtros.zona.trim()}`;

  // Zona del catálogo (id): buscamos su nombre en la universidad correspondiente.
  if (filtros.zonaId != null) {
    for (const u of universidades) {
      const z = u.zonas?.find((zz) => zz.id === filtros.zonaId);
      if (z) return `en ${z.nombre}`;
    }
  }

  // Universidad seleccionada.
  if (filtros.universidadId != null) {
    const u = universidades.find((uu) => uu.id === filtros.universidadId);
    if (u) return `cerca de ${u.nombre}`;
  }

  // Geolocalización real activa ("Cerca de mí").
  if (opts?.cercaDeMi) return 'cerca de ti';

  // Por defecto: el campus principal del catálogo.
  const principal = universidades.find((u) => u.esPrincipal);
  if (principal) return `cerca de ${principal.nombre}`;

  return '';
}
