/**
 * Constante de coordenadas de la Universidad Peruana Unión (Lima).
 * Se usa como ancla para calcular distancias y ordenar propiedades.
 */
export const UPEU_COORDS: { lat: number; lng: number } = { lat: -11.99024, lng: -76.83992 };

export const UPEU_RADIO_MAX_KM = 15;

export interface LatLng {
  lat: number;
  lng: number;
}

// Ancla de campus en runtime. Por defecto UPeU (constante de respaldo arriba), pero se
// hidrata desde el catálogo (servicio-catalogos /universidades/principal) vía
// `setCampusAnchor` al cargar la app. Así, al cambiar el campus/radio en el admin, las
// distancias y filtros del frontend siguen ese valor sin tocar cada consumidor.
let _campusAnchor: LatLng = { ...UPEU_COORDS };
let _campusRadioMaxKm = UPEU_RADIO_MAX_KM;

export function getCampusAnchor(): LatLng {
  return _campusAnchor;
}

export function getCampusRadioMaxKm(): number {
  return _campusRadioMaxKm;
}

export function setCampusAnchor(lat: number, lng: number, radioMaxKm?: number): void {
  if (typeof lat === 'number' && typeof lng === 'number') {
    _campusAnchor = { lat, lng };
  }
  if (typeof radioMaxKm === 'number' && radioMaxKm > 0) {
    _campusRadioMaxKm = radioMaxKm;
  }
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
  return distanciaHaversineKm(coords, _campusAnchor);
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

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Geocodifica una dirección a coordenadas con Nominatim (OpenStreetMap) — gratis, sin API key,
 * acotado a Perú. Devuelve el primer resultado o null. Pensado para uso de baja frecuencia
 * (un arrendador escribiendo una dirección, con debounce); respeta la política de Nominatim.
 */
// Bounding box de Lima metropolitana como sesgo suave (viewbox=lon_min,lat_max,lon_max,lat_min).
// Con bounded=0 solo PRIORIZA resultados ahí, sin excluir el resto del país.
const VIEWBOX_LIMA = '-77.25,-11.65,-76.60,-12.35';

export async function geocodificarDireccion(direccion: string): Promise<GeocodeResult | null> {
  const q = direccion.trim();
  if (q.length < 5) return null;
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pe' +
    `&viewbox=${VIEWBOX_LIMA}&bounded=0&q=` +
    encodeURIComponent(q);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const r = data[0] as { lat?: string; lon?: string; display_name?: string };
    const lat = parseFloat(r.lat ?? '');
    const lng = parseFloat(r.lon ?? '');
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng, displayName: r.display_name ?? '' };
  } catch {
    return null;
  }
}

/**
 * Reverse geocoding (coordenadas → dirección) con Nominatim. Devuelve el display_name
 * o null. Sirve para autocompletar la dirección al mover el pin o usar el GPS.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=0&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const d = (await res.json()) as { display_name?: string };
    return d?.display_name ?? null;
  } catch {
    return null;
  }
}

/**
 * Minutos estimados a pie desde una distancia en km (velocidad media ~4.5 km/h).
 * Es una ESTIMACIÓN sobre la línea recta; la ruta real (Google Maps) puede variar.
 */
export function minutosCaminando(km: number | null | undefined): number | null {
  if (km === null || km === undefined || Number.isNaN(km)) return null;
  return Math.max(1, Math.round((km / 4.5) * 60));
}

/**
 * URL de "cómo llegar" en Google Maps: abre la ruta REAL + tiempo, sin API key ni costo.
 */
export function googleMapsRutaUrl(
  origen: LatLng,
  destino: LatLng,
  modo: 'walking' | 'driving' | 'transit' = 'walking',
): string {
  return (
    'https://www.google.com/maps/dir/?api=1' +
    `&origin=${origen.lat},${origen.lng}` +
    `&destination=${destino.lat},${destino.lng}` +
    `&travelmode=${modo}`
  );
}

/** Geometría mínima de una zona de cobertura para resolución punto-en-zona. */
export interface ZonaGeo {
  id?: number;
  nombre: string;
  universidadId?: number;
  universidadNombre?: string;
  ordenPrioridad?: number;
  tipoLimite: 'CIRCULO' | 'POLIGONO';
  latitud?: number | null;
  longitud?: number | null;
  radioKm?: number | null;
  poligonoJson?: string | null;
}

function puntoEnCirculo(p: LatLng, z: ZonaGeo): boolean {
  if (z.latitud == null || z.longitud == null || z.radioKm == null) return false;
  return distanciaHaversineKm(p, { lat: z.latitud, lng: z.longitud }) <= z.radioKm;
}

/** Ray casting sobre el array JSON de vértices [{ lat, lng }, ...]. */
function puntoEnPoligono(p: LatLng, poligonoJson?: string | null): boolean {
  if (!poligonoJson || !poligonoJson.trim()) return false;
  let pts: Array<{ lat: number; lng: number }>;
  try {
    const data: unknown = JSON.parse(poligonoJson);
    if (!Array.isArray(data)) return false;
    pts = (data as Array<{ lat?: unknown; lng?: unknown }>)
      .filter((q) => q && typeof q.lat === 'number' && typeof q.lng === 'number')
      .map((q) => ({ lat: q.lat as number, lng: q.lng as number }));
  } catch {
    return false;
  }
  if (pts.length < 3) return false;
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const yi = pts[i].lat, xi = pts[i].lng;
    const yj = pts[j].lat, xj = pts[j].lng;
    const cruza =
      (yi > p.lat) !== (yj > p.lat) &&
      p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

/**
 * Resuelve la primera zona que contiene el punto (la lista debería venir ordenada por
 * `ordenPrioridad`; igual se ordena por seguridad). Devuelve `null` si no cae en ninguna.
 * Replica la lógica del backend (ZonaResolver) para que el feedback en vivo del formulario
 * coincida con la validación al guardar.
 */
export function resolverZona(p: LatLng | null | undefined, zonas: ZonaGeo[]): ZonaGeo | null {
  if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return null;
  if (Number.isNaN(p.lat) || Number.isNaN(p.lng)) return null;
  const ordenadas = [...zonas].sort((a, b) => (a.ordenPrioridad ?? 0) - (b.ordenPrioridad ?? 0));
  for (const z of ordenadas) {
    const tipo = (z.tipoLimite || '').toUpperCase();
    if (tipo === 'CIRCULO' && puntoEnCirculo(p, z)) return z;
    if (tipo === 'POLIGONO' && puntoEnPoligono(p, z.poligonoJson)) return z;
  }
  return null;
}
