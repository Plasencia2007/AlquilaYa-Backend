/**
 * Constante de coordenadas de la Universidad Peruana Unión (Lima).
 * Se usa como ancla para calcular distancias y ordenar propiedades.
 */
export const UPEU_COORDS = { lat: -11.9878, lng: -76.898 } as const;

export const UPEU_RADIO_MAX_KM = 15;

export interface LatLng {
  lat: number;
  lng: number;
}

const RADIO_TIERRA_KM = 6371;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/**
 * Distancia ortodrómica (haversine) entre dos puntos en km.
 * Aproximación válida para distancias <500 km.
 */
export function distanciaHaversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
}

/**
 * Distancia desde un punto a UPeU. Devuelve `null` si el punto no tiene
 * coordenadas — útil para ordenar al final las propiedades sin GPS.
 */
export function distanciaAUpeuKm(coords: LatLng | undefined | null): number | null {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    return null;
  }
  return distanciaHaversineKm(coords, UPEU_COORDS);
}

/**
 * Formatea distancia para UI. <1 km en metros, >=1 km con 1 decimal.
 *   0.42 -> "420 m"
 *   1.0  -> "1.0 km"
 *   12.7 -> "12.7 km"
 */
export function formatearDistancia(km: number | null | undefined): string {
  if (km === null || km === undefined || Number.isNaN(km)) return 'sin ubicación';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
