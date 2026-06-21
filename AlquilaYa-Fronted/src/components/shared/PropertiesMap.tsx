'use client';

import { useEffect, useState } from 'react';
import { Circle, Polygon, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { getCampusAnchor, distanciaAUpeuKm, formatearDistancia, type LatLng } from '@/lib/geo';
import { universidadService, type ZonaResolucion } from '@/services/universidad-service';
import type { Propiedad } from '@/types/propiedad';
import { cn } from '@/lib/cn';

const propiedadIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 40"><defs><filter id="s" x="-40%" y="-20%" width="180%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/></filter></defs><path d="M14 0C6.268 0 0 6.268 0 14c0 10 14 26 14 26S28 24 28 14C28 6.268 21.732 0 14 0z" fill="#8f0304" filter="url(#s)"/><circle cx="14" cy="14" r="7" fill="white" opacity="0.9"/></svg>`
  )}`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -44],
});

const upeuIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 58"><defs><filter id="s" x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-opacity="0.4"/></filter></defs><path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 38 20 38S40 34 40 20C40 8.954 31.046 0 20 0z" fill="#e53e3e" filter="url(#s)"/><circle cx="20" cy="20" r="11" fill="white" opacity="0.95"/></svg>`
  )}`,
  iconSize: [40, 58],
  iconAnchor: [20, 58],
  popupAnchor: [0, -62],
});

interface Props {
  propiedades: Propiedad[];
  className?: string;
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
  propiedades: Propiedad[];
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

export default function PropertiesMap({ propiedades, className }: Props) {
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
    <div className={cn('isolate', className)}>
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
          return (
            <Marker
              key={p.id}
              position={[p.coordenadas!.lat, p.coordenadas!.lng]}
              icon={propiedadIcon}
            >
              <Popup minWidth={190} maxWidth={190} closeButton={false}>
                <a
                  href={`/property/${p.id}`}
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
                    <p style={{ margin: '4px 0 0', fontWeight: 900, fontSize: 14, color: 'var(--primary)' }}>
                      S/ {p.precio.toLocaleString('es-PE')}
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
