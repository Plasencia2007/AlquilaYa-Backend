'use client';

import { useEffect, useState } from 'react';
import { Circle, Polygon, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { getCampusAnchor, distanciaAUpeuKm, formatearDistancia, type LatLng } from '@/lib/geo';
import { universidadService, type ZonaResolucion } from '@/services/universidad-service';
import { cn } from '@/lib/cn';
import { formatPEN } from '@/lib/money';

/** Estado de moderación (ítem 389) — no confundir con `Propiedad['estado']` (legacy, otro dominio). */
export type EstadoModeracion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

/**
 * Forma mínima que necesita el mapa. Cualquier `Propiedad` (catálogo público) la satisface
 * estructuralmente, así que los callers existentes (`search-map`, `home-map-section`,
 * `property/[id]/page`) no necesitan cambios. El mapa admin (ítem 389) construye este shape
 * directo desde `PropiedadAdminDTO` (que no tiene todos los campos de `Propiedad`).
 */
export interface PropiedadMapa {
  id: string;
  titulo: string;
  precio: number;
  imagenes: string[];
  coordenadas?: LatLng;
  /** Solo se usa si `colorByEstado` está activo (ítem 389). */
  estadoModeracion?: EstadoModeracion;
}

/** Colores semánticos por estado de moderación (tokens de `globals.css`, no hex nuevo). */
const COLOR_ESTADO: Record<EstadoModeracion, string> = {
  PENDIENTE: 'var(--warning)',
  APROBADO: 'var(--success)',
  RECHAZADO: 'var(--destructive)',
};

const upeuIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 58"><defs><filter id="s" x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-opacity="0.4"/></filter></defs><path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 38 20 38S40 34 40 20C40 8.954 31.046 0 20 0z" fill="#e53e3e" filter="url(#s)"/><circle cx="20" cy="20" r="11" fill="white" opacity="0.95"/></svg>`
  )}`,
  iconSize: [40, 58],
  iconAnchor: [20, 58],
  popupAnchor: [0, -62],
});

interface Props {
  propiedades: PropiedadMapa[];
  className?: string;
  /** id de la propiedad resaltada (hover desde el grid) — su pastilla se destaca. */
  activeId?: string | null;
  /** Notifica hover sobre un marcador (para resaltar la card correspondiente). */
  onHover?: (id: string | null) => void;
  /** Ítem 389: colorea los pines por `estadoModeracion` (PENDIENTE/APROBADO/RECHAZADO) en vez
   *  de por precio/hover. Usado por el mapa admin de `metrics/heatmap/page.tsx`. */
  colorByEstado?: boolean;
  /**
   * Ítem 389: destino del popup del pin. Por defecto va a la ficha pública (`/property/{id}`) —
   * el mapa admin la reemplaza por un link a la revisión, porque una propiedad PENDIENTE/RECHAZADA
   * no es visible en la ficha pública.
   */
  hrefBuilder?: (p: PropiedadMapa) => string;
}

/** Pastilla de precio estilo Airbnb como marcador del mapa. `colorEstado`: override del ítem 389. */
function precioDivIcon(precio: number, activo: boolean, colorEstado?: string): L.DivIcon {
  const txt = formatPEN(Math.round(precio));
  const w = Math.max(48, txt.length * 8 + 18);
  const bg = colorEstado ?? (activo ? '#1d1b19' : '#ffffff');
  const fg = colorEstado ? '#ffffff' : (activo ? '#ffffff' : '#1d1b19');
  return L.divIcon({
    className: '',
    html:
      `<div style="display:flex;align-items:center;justify-content:center;height:28px;padding:0 10px;` +
      `border-radius:9999px;background:${bg};color:${fg};font-weight:800;font-size:12px;white-space:nowrap;` +
      `box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1px solid rgba(0,0,0,0.08);` +
      `transform:scale(${activo ? 1.1 : 1});transition:transform .12s;cursor:pointer;">${txt}</div>`,
    iconSize: [w, 28],
    iconAnchor: [w / 2, 14],
  });
}

/** Vértices del polígono ({ lat, lng }) parseados a tuplas [lat, lng] de Leaflet. */
function parsePoligono(json?: string | null): [number, number][] {
  if (!json || !json.trim()) return [];
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return (data as Array<{ lat?: unknown; lng?: unknown }>)
      .filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => [p.lat as number, p.lng as number]);
  } catch {
    return [];
  }
}

function FitBounds({
  propiedades,
  zonas,
  center,
}: {
  propiedades: PropiedadMapa[];
  zonas: ZonaResolucion[];
  center: LatLng;
}) {
  const map = useMap();

  useEffect(() => {
    const puntos: [number, number][] = [[center.lat, center.lng]];
    for (const p of propiedades) {
      if (p.coordenadas) puntos.push([p.coordenadas.lat, p.coordenadas.lng]);
    }
    // Incluir la extensión de cada zona para que la cobertura completa entre en cuadro.
    for (const z of zonas) {
      if (z.tipoLimite === 'CIRCULO' && z.latitud != null && z.longitud != null && z.radioKm) {
        const dLat = z.radioKm / 111;
        const dLng = z.radioKm / (111 * Math.cos((z.latitud * Math.PI) / 180));
        puntos.push([z.latitud + dLat, z.longitud + dLng], [z.latitud - dLat, z.longitud - dLng]);
      } else if (z.tipoLimite === 'POLIGONO') {
        puntos.push(...parsePoligono(z.poligonoJson));
      }
    }
    if (puntos.length === 1) {
      map.setView(puntos[0], 13);
      return;
    }
    map.fitBounds(new LatLngBounds(puntos), { padding: [40, 40], maxZoom: 15 });
  }, [propiedades, zonas, center, map]);

  return null;
}

export default function PropertiesMap({ propiedades, className, activeId, onHover, colorByEstado, hrefBuilder }: Props) {
  const propiedadesConCoords = propiedades.filter((p) => p.coordenadas);

  const [zonas, setZonas] = useState<ZonaResolucion[]>([]);
  const [campus, setCampus] = useState<LatLng>(getCampusAnchor());

  useEffect(() => {
    let cancel = false;
    universidadService
      .listarZonasActivas()
      .then((z) => { if (!cancel) setZonas(Array.isArray(z) ? z : []); })
      .catch(() => {});
    universidadService
      .obtenerCampusPrincipal()
      .then((c) => {
        if (!cancel && c && c.latitud != null && c.longitud != null) {
          setCampus({ lat: c.latitud, lng: c.longitud });
        }
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  const zonaPath = {
    fillColor: '#3b82f6',
    fillOpacity: 0.1,
    color: '#3b82f6',
    weight: 1.5,
    opacity: 0.65,
  };

  return (
    // aria-hidden (ítem 400): Leaflet no es operable por teclado en la práctica; el mapa
    // sigue siendo usable con mouse/touch, pero un lector de pantalla no debe intentar
    // "leer" el canvas ni sus pines/popups. La info equivalente (precio, título, ubicación)
    // ya vive en paralelo en la lista/tarjetas que consumen esta misma data.
    <div className={cn('isolate', className)} aria-hidden="true">
      <MapContainer
        center={[campus.lat, campus.lng]}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds propiedades={propiedadesConCoords} zonas={zonas} center={campus} />

        {/* Zonas de cobertura reales del catálogo (círculo o polígono) */}
        {zonas.map((z) => {
          if (z.tipoLimite === 'CIRCULO' && z.latitud != null && z.longitud != null && z.radioKm) {
            return (
              <Circle
                key={z.id}
                center={[z.latitud, z.longitud]}
                radius={z.radioKm * 1000}
                pathOptions={zonaPath}
              />
            );
          }
          const pts = parsePoligono(z.poligonoJson);
          if (pts.length >= 3) {
            return <Polygon key={z.id} positions={pts} pathOptions={zonaPath} />;
          }
          return null;
        })}

        <Marker position={[campus.lat, campus.lng]} icon={upeuIcon}>
          <Popup>
            <strong>Universidad Peruana Unión</strong>
            <br />
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Tu universidad</span>
          </Popup>
        </Marker>

        {propiedadesConCoords.map((p) => {
          const distancia = distanciaAUpeuKm(p.coordenadas);
          const imagen = p.imagenes[0] ?? '/rooms/placeholder.jpg';
          const activo = activeId === p.id;
          const colorEstado = colorByEstado ? COLOR_ESTADO[p.estadoModeracion ?? 'PENDIENTE'] : undefined;
          return (
            <Marker
              key={p.id}
              position={[p.coordenadas!.lat, p.coordenadas!.lng]}
              icon={precioDivIcon(p.precio, activo, colorEstado)}
              zIndexOffset={activo ? 1000 : 0}
              eventHandlers={{
                mouseover: () => onHover?.(p.id),
                mouseout: () => onHover?.(null),
              }}
            >
              <Popup minWidth={190} maxWidth={190} closeButton={false}>
                <a
                  href={hrefBuilder ? hrefBuilder(p) : `/property/${p.id}`}
                  style={{ display: 'block', width: 190, textDecoration: 'none', borderRadius: 10, overflow: 'hidden' }}
                >
                  <img
                    src={imagen}
                    alt={p.titulo}
                    style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '8px 10px 10px', background: 'var(--card)', color: 'var(--card-foreground)' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.titulo}
                    </p>
                    {distancia !== null && (
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--primary)' }}>
                        a {formatearDistancia(distancia)} de UPeU
                      </p>
                    )}
                    <p className="tnum" style={{ margin: '4px 0 0', fontWeight: 900, fontSize: 14, color: 'var(--primary)' }}>
                      {formatPEN(p.precio)}
                      <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 3, color: 'var(--muted-foreground)' }}>/mes</span>
                    </p>
                  </div>
                </a>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
