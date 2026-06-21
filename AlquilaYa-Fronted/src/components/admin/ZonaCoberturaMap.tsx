'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Polygon, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TipoLimite } from '@/services/universidad-service';

const customIcon = L.divIcon({
  html: `<span class="material-symbols-outlined" style="color: #bb0506; font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">location_on</span>`,
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export interface LatLngPunto {
  lat: number;
  lng: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface ZonaCoberturaMapProps {
  center: LatLngPunto;
  /** Mueve el centro del círculo (modo CIRCULO). */
  onPositionChange: (lat: number, lng: number) => void;
  /** Agrega un vértice al polígono al hacer clic (modo POLIGONO). */
  onAppendVertex?: (lat: number, lng: number) => void;
  tipoLimite: TipoLimite;
  /** Radio en km para el preview del círculo. */
  radioKm?: number;
  /** Vértices ya parseados para el preview del polígono. */
  poligonoPuntos?: LatLngPunto[];
  color?: string;
}

function DraggableMarker({ center, onPositionChange }: Pick<ZonaCoberturaMapProps, 'center' | 'onPositionChange'>) {
  const [position, setPosition] = useState(center);

  useEffect(() => {
    setPosition(center);
  }, [center]);

  const eventHandlers = useMemo(
    () => ({
      dragend(e: L.LeafletEvent) {
        const pos = (e.target as L.Marker).getLatLng();
        setPosition(pos);
        onPositionChange(pos.lat, pos.lng);
      },
    }),
    [onPositionChange],
  );

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      icon={customIcon}
    />
  );
}

function MapClickHandler({
  tipoLimite,
  onPositionChange,
  onAppendVertex,
}: Pick<ZonaCoberturaMapProps, 'tipoLimite' | 'onPositionChange' | 'onAppendVertex'>) {
  useMapEvents({
    click(e) {
      if (tipoLimite === 'POLIGONO' && onAppendVertex) {
        onAppendVertex(e.latlng.lat, e.latlng.lng);
      } else {
        onPositionChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function ChangeView({ center }: { center: LatLngPunto }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
}

/** Vuela el mapa a un destino concreto (búsqueda), acercando el zoom — sin re-zoomear al arrastrar. */
function FlyTo({ target }: { target: LatLngPunto | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 16, { duration: 1 });
    }
  }, [target, map]);
  return null;
}

export default function ZonaCoberturaMap({
  center,
  onPositionChange,
  onAppendVertex,
  tipoLimite,
  radioKm,
  poligonoPuntos,
  color = '#8f0304',
}: ZonaCoberturaMapProps) {
  const pathOptions = { color, fillColor: color, fillOpacity: 0.15, weight: 2 };
  const esPoligono = tipoLimite === 'POLIGONO';
  const vertices = poligonoPuntos ?? [];

  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<NominatimResult[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [flyTarget, setFlyTarget] = useState<LatLngPunto | null>(null);

  const buscar = async () => {
    const query = q.trim();
    if (!query) return;
    setBuscando(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=pe&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const data: NominatimResult[] = await res.json();
      setResultados(Array.isArray(data) ? data : []);
    } catch {
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  };

  const elegir = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    onPositionChange(lat, lng);
    setFlyTarget({ lat, lng });
    setResultados([]);
    setQ(r.display_name.split(',')[0]);
  };

  return (
    <div className="mt-2">
      {/* Buscador de lugar estilo Google Maps */}
      <div className="relative mb-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg">search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  buscar();
                }
              }}
              placeholder="Buscar lugar o universidad (ej. UPeU Ñaña)…"
              className="w-full h-10 rounded-md border border-slate-200 pl-10 pr-3 text-sm bg-white focus:border-primary outline-none"
            />
          </div>
          <button
            type="button"
            onClick={buscar}
            disabled={buscando}
            className="h-10 px-4 rounded-md bg-slate-900 text-white text-xs font-bold disabled:opacity-50"
          >
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        {resultados.length > 0 && (
          <ul className="absolute z-[1000] mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
            {resultados.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => elegir(r)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mapa */}
      <div className="w-full h-[360px] rounded-md overflow-hidden border border-slate-200 z-0">
        <MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={center} />
          <FlyTo target={flyTarget} />
          <MapClickHandler tipoLimite={tipoLimite} onPositionChange={onPositionChange} onAppendVertex={onAppendVertex} />

          {/* En modo círculo: marcador arrastrable = centro. */}
          {!esPoligono && <DraggableMarker center={center} onPositionChange={onPositionChange} />}

          {tipoLimite === 'CIRCULO' && radioKm && radioKm > 0 && (
            <Circle center={[center.lat, center.lng]} radius={radioKm * 1000} pathOptions={pathOptions} />
          )}

          {/* En modo polígono: cada clic agrega un vértice. Mostramos los puntos y el área. */}
          {esPoligono && vertices.map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lng]}
              radius={5}
              pathOptions={{ color, fillColor: '#ffffff', fillOpacity: 1, weight: 2 }}
            />
          ))}
          {esPoligono && vertices.length >= 3 && (
            <Polygon positions={vertices.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={pathOptions} />
          )}
        </MapContainer>
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        {esPoligono
          ? 'Haz clic en el mapa para ir agregando los vértices del polígono (mínimo 3). Usa los botones de arriba para deshacer o limpiar.'
          : 'Busca el lugar, luego arrastra el marcador o haz clic en el mapa para fijar el centro exacto del radio.'}
      </p>
    </div>
  );
}
