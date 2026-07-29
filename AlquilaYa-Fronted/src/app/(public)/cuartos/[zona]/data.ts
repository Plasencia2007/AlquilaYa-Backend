import type { PropiedadPublicoDTO } from '@/services/property-service';
import type { ZonaResolucion } from '@/services/universidad-service';

/**
 * Helpers server-side de las landings SEO `/cuartos/[zona]` (ítem 134).
 *
 * Se llama al backend con `fetch` absoluto (no la instancia Axios del cliente):
 * en el servidor se necesita la URL interna del gateway. Se reutiliza el mismo
 * patrón que `property/[id]/layout.tsx` (BACKEND_INTERNAL_URL, con caché ISR).
 * Ambos endpoints son públicos (`permitAll` en el gateway/servicios).
 *
 * `import type` para los DTOs: son solo tipos, no arrastran código de cliente
 * (Axios, mocks) a este módulo server.
 */

const BACKEND = (process.env.BACKEND_INTERNAL_URL || 'http://localhost:8080').replace(/\/$/, '');

/** Nombre de zona → slug kebab-case sin acentos ("San Martín" → "san-martin"). */
export function slugifyZona(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos combinados
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Zonas activas del catálogo (endpoint público). Devuelve [] si el backend falla. */
export async function obtenerZonasActivas(): Promise<ZonaResolucion[]> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/catalogos/universidades/zonas/activas`, {
      next: { revalidate: 3600 }, // catálogo estable → cachea 1h
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as ZonaResolucion[]) : [];
  } catch {
    return [];
  }
}

/** Resuelve una zona por su slug (kebab-case del nombre). `null` si no existe. */
export async function resolverZonaPorSlug(slug: string): Promise<ZonaResolucion | null> {
  const zonas = await obtenerZonasActivas();
  return zonas.find((z) => slugifyZona(z.nombre) === slug) ?? null;
}

/** Primeros resultados públicos de una zona (`GET /propiedades/buscar?zonaId=`). [] si falla. */
export async function buscarPorZona(zonaId: number): Promise<PropiedadPublicoDTO[]> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/propiedades/buscar?zonaId=${zonaId}`, {
      next: { revalidate: 600 }, // resultados cambian más → cachea 10 min
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as PropiedadPublicoDTO[]) : [];
  } catch {
    return [];
  }
}
