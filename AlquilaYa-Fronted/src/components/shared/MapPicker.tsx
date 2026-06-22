'use client';

import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ZonaGeo } from '@/lib/geo';

/** Convierte el JSON de vértices de una zona en posiciones [lat, lng] para Leaflet. */
function parsePoligono(json?: string | null): [number, number][] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => [p.lat as number, p.lng as number] as [number, number]);
  } catch {
    return [];
  }
}

const ZONA_STYLE = { color: '#bb0506', weight: 1, fillColor: '#bb0506', fillOpacity: 0.06 };

/** Dibuja las zonas de cobertura (círculos/polígonos) para que el arrendador vea dónde puede publicar. */
function ZonasOverlay({ zonas }: { zonas: ZonaGeo[] }) {
  return (
    <>
      {zonas.map((z, i) => {
        const tipo = (z.tipoLimite || '').toUpperCase();
        if (tipo === 'CIRCULO' && z.latitud != null && z.longitud != null && z.radioKm) {
          return (
            <Circle
              key={`c-${z.id ?? i}`}
              center={[z.latitud, z.longitud]}
              radius={z.radioKm * 1000}
              pathOptions={ZONA_STYLE}
            />
          );
        }
        if (tipo === 'POLIGONO') {
          const pts = parsePoligono(z.poligonoJson);
          if (pts.length >= 3) {
            return <Polygon key={`p-${z.id ?? i}`} positions={pts} pathOptions={ZONA_STYLE} />;
          }
        }
        return null;
      })}
    </>
  );
}

// Fix for default marker icons in Leaflet + Next.js
const customIcon = L.divIcon({
  html: `<span class="material-symbols-outlined" style="color: #bb0506; font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">location_on</span>`,
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface MapPickerProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
}

function DraggableMarker({ lat, lng, onPositionChange }: MapPickerProps) {
  const [position, setPosition] = useState({ lat, lng });

  useEffect(() => {
    setPosition({ lat, lng });
  }, [lat, lng]);

  const eventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const pos = e.target.getLatLng();
        setPosition(pos);
        onPositionChange(pos.lat, pos.lng);
      },
    }),
    [onPositionChange],
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      icon={customIcon}
    />
  );
}

function MapClickHandler({ onPositionChange }: { onPositionChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMapEvents({});
  map.setView(center, map.getZoom());
  return null;
}

export default function MapPicker({
  lat,
  lng,
  onPositionChange,
  zonas,
}: MapPickerProps & { zonas?: ZonaGeo[] }) {
  return (
    <div className="w-full h-[200px] rounded-xl overflow-hidden border border-[#bda5a8]/20 shadow-inner mt-2 animate-scale-in">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={[lat, lng]} />
        {zonas && zonas.length > 0 && <ZonasOverlay zonas={zonas} />}
        <MapClickHandler onPositionChange={onPositionChange} />
        <DraggableMarker lat={lat} lng={lng} onPositionChange={onPositionChange} />
      </MapContainer>
    </div>
  );
}
