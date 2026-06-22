import { universidadService, type ZonaResolucion } from '@/services/universidad-service';

/**
 * Caché a nivel de módulo de las zonas de cobertura: se piden UNA sola vez y se comparten
 * entre todos los componentes (ej. cada PropertyCard que resuelve su distancia por-propiedad),
 * evitando N llamadas. Si falla, devuelve [] y no rompe nada.
 */
let _promise: Promise<ZonaResolucion[]> | null = null;

export function getZonasCached(): Promise<ZonaResolucion[]> {
  if (!_promise) {
    _promise = universidadService.listarZonasActivas().catch(() => [] as ZonaResolucion[]);
  }
  return _promise;
}
