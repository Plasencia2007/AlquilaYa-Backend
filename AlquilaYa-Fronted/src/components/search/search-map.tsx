'use client';

/**
 * Mapa de resultados de la búsqueda (estilo Airbnb) — EXCLUSIVO de /search.
 *
 * Es un mapa Leaflet independiente del compartido `shared/PropertiesMap` (que sigue
 * sirviendo al home). Aquí añadimos features propias de la búsqueda:
 *  - 114 Clusters de marcadores (leaflet.markercluster) con conteo.
 *  - 115 Marcador = pastilla de precio "S/ 450" con estados normal / hover / activo.
 *  - 116 Botón flotante "Buscar en esta área" tras mover el mapa (moveend).
 *  - 117 Sincronía hover card ↔ marcador vía `activeId` / `onHover`.
 *
 * Se carga con import dinámico (`ssr:false`) porque Leaflet no funciona en SSR; el
 * skeleton (119) vive en el `loading` de ese dynamic (ver map-results.tsx).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Circle, MapContainer, Marker, Polygon, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { Search, X } from 'lucide-react';

import {
  distanciaAUpeuKm,
  distanciaHaversineKm,
  formatearDistancia,
  getCampusAnchor,
  type LatLng,
} from '@/lib/geo';
import { universidadService, type ZonaResolucion } from '@/services/universidad-service';
import type { CentroBusqueda } from '@/hooks/use-properties-search';
import type { Propiedad } from '@/types/propiedad';
import { cn } from '@/lib/cn';
import { formatPEN } from '@/lib/money';

// ── Estilos de los marcadores inyectados como divIcon (HTML crudo) ────────────
// El HTML del divIcon se inyecta fuera del árbol de React, así que las clases
// utilitarias de Tailwind no aplican de forma fiable; usamos clases propias
// (`ay-*`) definidas aquí + variables de color del tema en estilos inline.
const MAP_CSS = `
.ay-pill{display:flex;align-items:center;justify-content:center;height:28px;padding:0 10px;
  border-radius:9999px;font-weight:800;font-size:12px;line-height:1;white-space:nowrap;
  border:1px solid;box-shadow:0 2px 8px rgba(0,0,0,.22);cursor:pointer;
  transition:transform .12s ease,box-shadow .12s ease;}
.ay-pill:hover{transform:scale(1.08);box-shadow:0 4px 12px rgba(0,0,0,.28);}
.ay-pill--active{transform:scale(1.12);box-shadow:0 6px 16px rgba(0,0,0,.3);}
.ay-pill--active:hover{transform:scale(1.14);}
.ay-cluster{display:flex;align-items:center;justify-content:center;border-radius:9999px;
  background:var(--primary);color:var(--primary-foreground);font-weight:800;font-size:13px;
  border:2px solid var(--card);box-shadow:0 2px 8px rgba(0,0,0,.28);cursor:pointer;}
`;

// Pin de la universidad (mismo estilo que el mapa del home, para coherencia).
const upeuIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 58"><defs><filter id="s" x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-opacity="0.4"/></filter></defs><path d="M20 0C8.954 0 0 8.954 0 20c0 14 20 38 20 38S40 34 40 20C40 8.954 31.046 0 20 0z" fill="#e53e3e" filter="url(#s)"/><circle cx="20" cy="20" r="11" fill="white" opacity="0.95"/></svg>`,
  )}`,
  iconSize: [40, 58],
  iconAnchor: [20, 58],
  popupAnchor: [0, -62],
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/** 115 — Pastilla de precio como marcador, con estado activo (117). */
function precioDivIcon(precio: number, activo: boolean): L.DivIcon {
  const txt = formatPEN(Math.round(precio));
  const w = Math.max(46, txt.length * 8 + 20);
  const bg = activo ? 'var(--primary)' : 'var(--card)';
  const fg = activo ? 'var(--primary-foreground)' : 'var(--foreground)';
  const bc = activo ? 'var(--primary)' : 'var(--border)';
  return L.divIcon({
    className: '',
    html: `<div class="ay-pill${activo ? ' ay-pill--active' : ''}" style="background:${bg};color:${fg};border-color:${bc}">${txt}</div>`,
    iconSize: [w, 28],
    iconAnchor: [w / 2, 14],
  });
}

/** 114 — Icono del cluster: círculo con el conteo, tamaño según cantidad. */
function clusterDivIcon(count: number): L.DivIcon {
  const size = count < 10 ? 34 : count < 100 ? 42 : 52;
  return L.divIcon({
    className: '',
    html: `<div class="ay-cluster" style="width:${size}px;height:${size}px">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Popup del marcador (imagen + título + distancia + precio + link a la ficha). */
function popupHtml(p: Propiedad): string {
  const img = p.imagenes[0] ?? '/rooms/placeholder.jpg';
  const dist = distanciaAUpeuKm(p.coordenadas);
  const distHtml =
    dist !== null
      ? `<p style="margin:2px 0 0;font-size:10px;color:var(--primary)">a ${formatearDistancia(dist)} de UPeU</p>`
      : '';
  return (
    `<a href="/property/${p.id}" style="display:block;width:190px;text-decoration:none;border-radius:10px;overflow:hidden">` +
    `<img src="${escapeHtml(img)}" alt="" style="width:100%;height:110px;object-fit:cover;display:block"/>` +
    `<div style="padding:8px 10px 10px;background:var(--card);color:var(--card-foreground)">` +
    `<p style="margin:0;font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.titulo)}</p>` +
    distHtml +
    `<p style="margin:4px 0 0;font-weight:900;font-size:14px;color:var(--primary)">${formatPEN(p.precio)}` +
    `<span style="font-weight:400;font-size:10px;margin-left:3px;color:var(--muted-foreground)">/mes</span></p>` +
    `</div></a>`
  );
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

const zonaPath = {
  fillColor: '#3b82f6',
  fillOpacity: 0.1,
  color: '#3b82f6',
  weight: 1.5,
  opacity: 0.65,
};

/** Puntos [lat,lng] que delimitan una zona: bbox del círculo o vértices del polígono. */
function puntosDeZona(z: ZonaResolucion): [number, number][] {
  if (z.tipoLimite === 'CIRCULO' && z.latitud != null && z.longitud != null && z.radioKm) {
    const dLat = z.radioKm / 111;
    const dLng = z.radioKm / (111 * Math.cos((z.latitud * Math.PI) / 180));
    return [
      [z.latitud + dLat, z.longitud + dLng],
      [z.latitud - dLat, z.longitud - dLng],
    ];
  }
  if (z.tipoLimite === 'POLIGONO') return parsePoligono(z.poligonoJson);
  return [];
}

// ── 135 — Persistencia del encuadre del mapa (centro + zoom) por pestaña ───────
// Se guarda en sessionStorage: al volver a /search el mapa recupera el último
// encuadre en lugar de saltar siempre a la vista por defecto. Efímero por diseño
// (no sobrevive al cierre del navegador).
const MAP_VIEW_KEY = 'alquilaya-search-map-view';

interface VistaGuardada {
  lat: number;
  lng: number;
  zoom: number;
}

function leerVistaGuardada(): VistaGuardada | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(MAP_VIEW_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<VistaGuardada>;
    if (typeof v.lat === 'number' && typeof v.lng === 'number' && typeof v.zoom === 'number') {
      return { lat: v.lat, lng: v.lng, zoom: v.zoom };
    }
  } catch {
    /* sessionStorage corrupto o no disponible → se ignora */
  }
  return null;
}

function guardarVista(map: L.Map): void {
  if (typeof window === 'undefined') return;
  try {
    const c = map.getCenter();
    const vista: VistaGuardada = { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
    window.sessionStorage.setItem(MAP_VIEW_KEY, JSON.stringify(vista));
  } catch {
    /* cuota llena / modo privado → se ignora, no es crítico */
  }
}

interface EngineProps {
  propiedades: Propiedad[];
  zonas: ZonaResolucion[];
  campus: LatLng;
  activeId: string | null;
  /** 135 — id de la zona filtrada en la URL; su encuadre tiene prioridad sobre el guardado. */
  zonaIdActiva: number | null;
  onHover?: (id: string | null) => void;
  onReady: (map: L.Map) => void;
  onUserMove: () => void;
}

/**
 * Controlador imperativo: gestiona el cluster group, los marcadores, el resaltado
 * por `activeId` (117), el encuadre inicial y la detección de `moveend` (116).
 * No renderiza nada (opera sobre el mapa vía `useMap`).
 */
function MapEngine({ propiedades, zonas, campus, activeId, zonaIdActiva, onHover, onReady, onUserMove }: EngineProps) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const propsByIdRef = useRef(new Map<string, Propiedad>());
  const programmaticRef = useRef(false); // el próximo moveend es programático (encuadre) → ignorar
  const hasFittedRef = useRef(false); // ya hicimos el encuadre inicial → no volver a mover la vista
  const prevActiveRef = useRef<string | null>(null);
  const activeIdRef = useRef(activeId);
  const onHoverRef = useRef(onHover);
  const onUserMoveRef = useRef(onUserMove);
  const onReadyRef = useRef(onReady);

  // Mantener refs de callbacks/estado frescas sin re-ejecutar los efectos pesados.
  useEffect(() => {
    activeIdRef.current = activeId;
    onHoverRef.current = onHover;
    onUserMoveRef.current = onUserMove;
    onReadyRef.current = onReady;
  });

  // Crear el cluster group + listener de moveend (una vez por instancia de mapa).
  useEffect(() => {
    onReadyRef.current(map);

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      chunkedLoading: true,
      iconCreateFunction: (c) => clusterDivIcon(c.getChildCount()),
    });
    map.addLayer(cluster);
    clusterRef.current = cluster;

    const onMove = () => {
      // Ignorar el moveend disparado por nuestro propio fitBounds/setView inicial.
      if (programmaticRef.current) {
        programmaticRef.current = false;
        return;
      }
      guardarVista(map); // 135 — recordar el encuadre tras un movimiento del usuario
      onUserMoveRef.current();
    };
    map.on('moveend', onMove);

    return () => {
      map.off('moveend', onMove);
      map.removeLayer(cluster);
      clusterRef.current = null;
    };
  }, [map]);

  // Reconstruir marcadores cuando cambian las propiedades (no en cada hover).
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    markersRef.current.clear();
    propsByIdRef.current.clear();

    const nuevos: L.Marker[] = [];
    for (const p of propiedades) {
      if (!p.coordenadas) continue;
      const activo = p.id === activeIdRef.current;
      const marker = L.marker([p.coordenadas.lat, p.coordenadas.lng], {
        icon: precioDivIcon(p.precio, activo),
        zIndexOffset: activo ? 1000 : 0,
      });
      marker.on('mouseover', () => onHoverRef.current?.(p.id));
      marker.on('mouseout', () => onHoverRef.current?.(null));
      marker.bindPopup(popupHtml(p), { minWidth: 190, maxWidth: 190, closeButton: false });
      markersRef.current.set(p.id, marker);
      propsByIdRef.current.set(p.id, p);
      nuevos.push(marker);
    }
    cluster.addLayers(nuevos);
  }, [propiedades]);

  // 117 — Resaltar el marcador cuyo id === activeId (y desmarcar el anterior),
  // actualizando solo esos 2 marcadores (sin reconstruir todo).
  useEffect(() => {
    const aplicar = (id: string, active: boolean) => {
      const m = markersRef.current.get(id);
      const p = propsByIdRef.current.get(id);
      if (!m || !p) return;
      m.setIcon(precioDivIcon(p.precio, active));
      m.setZIndexOffset(active ? 1000 : 0);
    };
    const prev = prevActiveRef.current;
    if (prev && prev !== activeId) aplicar(prev, false);
    if (activeId) aplicar(activeId, true);
    prevActiveRef.current = activeId;
  }, [activeId]);

  // Encuadre inicial (UNA sola vez). Prioridad: (1) zona filtrada activa → su bbox,
  // (2) último encuadre guardado en la sesión (135), (3) propiedades + zonas + campus.
  // Después se preserva el viewport (no re-encuadramos al filtrar o buscar por área).
  useEffect(() => {
    if (hasFittedRef.current) return;

    // (1) Prioridad: si hay una zona filtrada en la URL, encuadrar a ESA zona.
    if (zonaIdActiva != null) {
      const zona = zonas.find((z) => z.id === zonaIdActiva);
      const pts = zona ? puntosDeZona(zona) : [];
      if (pts.length > 0) {
        programmaticRef.current = true;
        map.fitBounds(new L.LatLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
        hasFittedRef.current = true;
        return;
      }
      // Zona activa pero las zonas aún no cargan → esperar antes de encuadrar.
      if (zonas.length === 0) return;
      // Ya cargaron y la zona no existe/geometría vacía → seguir al flujo normal.
    }

    // (2) Restaurar el último encuadre guardado en la sesión.
    const guardada = leerVistaGuardada();
    if (guardada) {
      programmaticRef.current = true;
      map.setView([guardada.lat, guardada.lng], guardada.zoom, { animate: false });
      hasFittedRef.current = true;
      return;
    }

    // (3) Encuadre por defecto: propiedades + zonas + campus.
    const pts: [number, number][] = [[campus.lat, campus.lng]];
    for (const p of propiedades) {
      if (p.coordenadas) pts.push([p.coordenadas.lat, p.coordenadas.lng]);
    }
    for (const z of zonas) {
      pts.push(...puntosDeZona(z));
    }
    if (pts.length <= 1) return; // aún sin datos reales → mantener la vista por defecto
    programmaticRef.current = true;
    map.fitBounds(new L.LatLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
    hasFittedRef.current = true;
  }, [propiedades, zonas, campus, map, zonaIdActiva]);

  return null;
}

interface Props {
  propiedades: Propiedad[];
  className?: string;
  /** id de la propiedad resaltada (hover desde el grid). */
  activeId?: string | null;
  /** Notifica hover sobre un marcador (para resaltar la card correspondiente). */
  onHover?: (id: string | null) => void;
  /** 116 — Ancla de proximidad del núcleo de búsqueda; con centro+radio del viewport
   *  re-dispara la búsqueda por área. `null` vuelve al listado normal. */
  setCentroBusqueda?: (c: CentroBusqueda | null) => void;
}

export default function SearchMap({ propiedades, className, activeId, onHover, setCentroBusqueda }: Props) {
  const [zonas, setZonas] = useState<ZonaResolucion[]>([]);
  const [campus, setCampus] = useState<LatLng>(getCampusAnchor());
  const [mostrarBuscarArea, setMostrarBuscarArea] = useState(false);
  const [areaActiva, setAreaActiva] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // 135 — zona filtrada activa (?zonaId= en la URL): su encuadre tiene prioridad
  // sobre el guardado al montar el mapa.
  const searchParams = useSearchParams();
  const zonaIdRaw = searchParams.get('zonaId');
  const zonaIdNum = zonaIdRaw != null ? Number(zonaIdRaw) : Number.NaN;
  const zonaIdActiva = Number.isFinite(zonaIdNum) ? zonaIdNum : null;

  useEffect(() => {
    let cancel = false;
    universidadService
      .listarZonasActivas()
      .then((z) => {
        if (!cancel) setZonas(Array.isArray(z) ? z : []);
      })
      .catch(() => {});
    universidadService
      .obtenerCampusPrincipal()
      .then((c) => {
        if (!cancel && c && c.latitud != null && c.longitud != null) {
          setCampus({ lat: c.latitud, lng: c.longitud });
        }
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  const propiedadesConCoords = propiedades.filter((p) => p.coordenadas);

  const handleReady = useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  const handleUserMove = useCallback(() => {
    setMostrarBuscarArea(true);
  }, []);

  // 116 — Buscar en el área visible: centro del viewport + radio hasta la esquina.
  const handleBuscarArea = () => {
    const map = mapRef.current;
    if (!map || !setCentroBusqueda) return;
    const c = map.getCenter();
    const ne = map.getBounds().getNorthEast();
    const radioKm =
      Math.round(
        distanciaHaversineKm({ lat: c.lat, lng: c.lng }, { lat: ne.lat, lng: ne.lng }) * 100,
      ) / 100;
    setCentroBusqueda({ lat: c.lat, lng: c.lng, radioKm: Math.max(0.5, radioKm) });
    setMostrarBuscarArea(false);
    setAreaActiva(true);
  };

  const handleLimpiarArea = () => {
    setCentroBusqueda?.(null);
    setAreaActiva(false);
    setMostrarBuscarArea(false);
  };

  return (
    <div
      role="region"
      aria-label="Mapa de propiedades; la misma información está disponible en la lista de resultados"
      className={cn('relative isolate h-full w-full', className)}
    >
      {/* 136 — Skip-link accesible: salta del mapa a la lista de resultados. Oculto
          salvo al recibir foco por teclado (patrón skip-link). El id destino
          `#resultados-busqueda` lo coloca el contenedor de la lista de resultados. */}
      <a
        href="#resultados-busqueda"
        className="sr-only left-3 top-3 z-[1300] rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg focus:not-sr-only focus:absolute"
      >
        Saltar a resultados
      </a>
      <style dangerouslySetInnerHTML={{ __html: MAP_CSS }} />

      {/* aria-hidden (ítem 400): Leaflet no es operable por teclado en la práctica; el mapa
          sigue siendo usable con mouse/touch, pero un lector de pantalla no debe intentar
          "leer" el canvas ni sus pines/popups (la misma info ya está en la lista de
          resultados). El wrapper se limita al `MapContainer` en sí — el skip-link y los
          botones flotantes ("Buscar en esta área"/"Ver todo el listado") viven FUERA de
          este `aria-hidden` para seguir siendo alcanzables por teclado/lector de pantalla. */}
      <div aria-hidden="true" className="h-full w-full">
        <MapContainer center={[campus.lat, campus.lng]} zoom={12} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Zonas de cobertura reales del catálogo (círculo o polígono). */}
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

          <MapEngine
            propiedades={propiedadesConCoords}
            zonas={zonas}
            campus={campus}
            activeId={activeId ?? null}
            zonaIdActiva={zonaIdActiva}
            onHover={onHover}
            onReady={handleReady}
            onUserMove={handleUserMove}
          />
        </MapContainer>
      </div>

      {/* 116 — Controles flotantes sobre el mapa (centrados arriba). */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-[1200] flex justify-center px-3">
        {setCentroBusqueda && mostrarBuscarArea && (
          <button
            type="button"
            onClick={handleBuscarArea}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-lg transition hover:bg-accent hover:text-accent-foreground"
          >
            <Search className="h-4 w-4" aria-hidden />
            Buscar en esta área
          </button>
        )}
        {setCentroBusqueda && areaActiva && !mostrarBuscarArea && (
          <button
            type="button"
            onClick={handleLimpiarArea}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-lg transition hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
            Ver todo el listado
          </button>
        )}
      </div>
    </div>
  );
}
