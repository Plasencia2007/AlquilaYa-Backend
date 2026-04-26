'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { UPEU_COORDS } from '@/lib/geo';
import type { Propiedad } from '@/types/propiedad';
import { PropertyCard } from '@/components/student/property-card';

const propiedadIcon = L.divIcon({
  html: `<div style="background:#8f0304;color:white;font-size:12px;font-weight:700;padding:6px 10px;border-radius:9999px;box-shadow:0 4px 14px rgba(0,0,0,0.25);transform:translate(-50%,-100%);white-space:nowrap;">●</div>`,
  className: 'alquilaya-marker-propiedad',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

const upeuIcon = L.divIcon({
  html: `<div style="background:#1d4ed8;color:white;font-size:11px;font-weight:800;padding:6px 12px;border-radius:9999px;box-shadow:0 4px 14px rgba(0,0,0,0.3);transform:translate(-50%,-100%);white-space:nowrap;">UPeU</div>`,
  className: 'alquilaya-marker-upeu',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
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
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [propiedades, map]);

  return null;
}

export default function PropertiesMap({ propiedades, className }: Props) {
  const propiedadesConCoords = propiedades.filter((p) => p.coordenadas);

  return (
    <div className={className}>
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

        <Marker position={[UPEU_COORDS.lat, UPEU_COORDS.lng]} icon={upeuIcon}>
          <Popup>
            <strong>Universidad Peruana Unión</strong>
            <br />
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Tu universidad</span>
          </Popup>
        </Marker>

        {propiedadesConCoords.map((p) => (
          <Marker
            key={p.id}
            position={[p.coordenadas!.lat, p.coordenadas!.lng]}
            icon={propiedadIcon}
          >
            <Popup minWidth={260} closeButton={false}>
              <div className="alquilaya-popup">
                <PropertyCard propiedad={p} variant="compact" showFavorite={false} />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
