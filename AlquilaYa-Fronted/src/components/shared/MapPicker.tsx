'use client';

import { useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  
  const eventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        const pos = marker.getLatLng();
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

// Map center management component
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMapEvents({});
  map.setView(center, map.getZoom());
  return null;
}

export default function MapPicker({ lat, lng, onPositionChange }: MapPickerProps) {
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
        <DraggableMarker lat={lat} lng={lng} onPositionChange={onPositionChange} />
      </MapContainer>
    </div>
  );
}
