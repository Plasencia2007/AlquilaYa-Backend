'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { adminService } from '@/services/adminService';
import { Propiedad } from '@/types/propiedad';

// Importación dinámica de Leaflet para evitar errores de SSR (window is not defined)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function PropertyHeatmap() {
  const [isMounted, setIsMounted] = useState(false);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const fetchData = async () => {
      try {
        const data = await adminService.getRealProperties();
        setPropiedades(data);
      } catch (error) {
        console.error('Failed to fetch real properties');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (!isMounted || loading) {
    return (
      <div className="w-full h-[500px] bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {loading ? 'Cargando Datos Reales...' : 'Inicializando Mapa...'}
          </span>
        </div>
      </div>
    );
  }

  // Centro de Lima aproximadamente
  const center: [number, number] = [-12.0464, -77.0428];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 p-8 rounded-xl overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Distribución Geográfica de Oferta</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Densidad de inmuebles verificados en Lima Metropolitana</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary/40 text-primary border border-primary/20"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Densidad Alta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-300 border border-slate-200"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Densidad Baja</span>
            </div>
          </div>
        </div>

        <div className="h-[500px] rounded-xl overflow-hidden border border-slate-100 z-0">
          <MapContainer 
            center={center} 
            zoom={12} 
            scrollWheelZoom={false} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {propiedades.map((prop) => (
              <Circle
                key={prop.id}
                center={[prop.coordenadas?.lat || -12, prop.coordenadas?.lng || -77]}
                pathOptions={{ 
                  fillColor: '#3b82f6', 
                  color: '#3b82f6', 
                  weight: 1, 
                  opacity: 0.1, 
                  fillOpacity: 0.25 
                }}
                radius={800} // Simula una "zona de calor" de 800m
              >
                <Popup>
                  <div className="p-2">
                    <p className="font-black text-xs text-slate-900 mb-1">{prop.titulo}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{prop.ubicacion}</p>
                    <div className="mt-2 border-t border-slate-100 pt-2 flex justify-between items-center">
                      <span className="text-primary font-black">S/ {prop.precio}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase">Activo</span>
                    </div>
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Heatmap Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: 'trending_up', label: 'Zona Hot', value: 'LIMA CENTRO', sub: '+15% de demanda' },
          { icon: 'insights', label: 'Expansión', value: 'LOS OLIVOS', sub: 'Oportunidad de oferta' },
          { icon: 'near_me', label: 'Radio Medio', value: '2.4 KM', sub: 'Distancia a Universidades' },
        ].map((insight, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-xl flex items-center gap-6">
            <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-lg">
              <span className="material-symbols-outlined text-slate-400 text-2xl">{insight.icon}</span>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{insight.label}</p>
              <h4 className="text-lg font-black text-slate-900 tracking-tight">{insight.value}</h4>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{insight.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
