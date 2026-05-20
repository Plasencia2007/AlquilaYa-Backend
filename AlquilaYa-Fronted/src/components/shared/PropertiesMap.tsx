'use client';

import { useEffect } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { UPEU_COORDS, distanciaAUpeuKm, formatearDistancia } from '@/lib/geo';
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

function FitBounds({ propiedades }: { propiedades: Propiedad[] }) {
  const map = useMap();

  useEffect(() => {
    const puntos: [number, number][] = [[UPEU_COORDS.lat, UPEU_COORDS.lng]];
    for (const p of propiedades) {
      if (p.coordenadas) puntos.push([p.coordenadas.lat, p.coordenadas.lng]);
    }
    if (puntos.length === 0) return;
    if (puntos.length === 1) {
      map.setView(puntos[0], 13);
      return;
    }
    const bounds = new LatLngBounds(puntos);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    map.once('zoomend', () => { if (map.getZoom() < 13) map.setZoom(13); });
  }, [propiedades, map]);

  return null;
}

export default function PropertiesMap({ propiedades, className }: Props) {
  const propiedadesConCoords = propiedades.filter((p) => p.coordenadas);

  return (
    <div className={cn('isolate', className)}>
      <MapContainer
        center={[UPEU_COORDS.lat, UPEU_COORDS.lng]}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds propiedades={propiedadesConCoords} />

        <Circle
          center={[UPEU_COORDS.lat, UPEU_COORDS.lng]}
          radius={1500}
          pathOptions={{
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            color: '#3b82f6',
            weight: 1.5,
            opacity: 0.5,
            dashArray: '6 4',
          }}
        />

        <Marker position={[UPEU_COORDS.lat, UPEU_COORDS.lng]} icon={upeuIcon}>
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
