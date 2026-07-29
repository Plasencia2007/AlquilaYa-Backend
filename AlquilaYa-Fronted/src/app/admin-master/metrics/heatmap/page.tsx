'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import { adminPropertyService, PropiedadAdminDTO } from '@/services/admin-property-service';
import type { PropiedadMapa } from '@/components/shared/PropertiesMap';
import PropertyHeatmap from '@/components/admin/PropertyHeatmap';

/** Leaflet rompe en SSR (accede a `window`) — mismo patrón que `home-map-section.tsx`. */
const PropertiesMap = dynamic(() => import('@/components/shared/PropertiesMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  ),
});

type Tab = 'densidad' | 'mapa';
type FiltroEstado = PropiedadAdminDTO['estado'] | '';

const ESTADOS: FiltroEstado[] = ['', 'PENDIENTE', 'APROBADO', 'RECHAZADO'];
const ETIQUETA_ESTADO: Record<FiltroEstado, string> = {
  '': 'Todas',
  PENDIENTE: 'Pendientes',
  APROBADO: 'Aprobadas',
  RECHAZADO: 'Rechazadas',
};
const LEYENDA: { estado: PropiedadAdminDTO['estado']; label: string; color: string }[] = [
  { estado: 'PENDIENTE', label: 'Pendiente', color: 'var(--warning)' },
  { estado: 'APROBADO', label: 'Aprobado', color: 'var(--success)' },
  { estado: 'RECHAZADO', label: 'Rechazado', color: 'var(--destructive)' },
];

/**
 * Ítem 352 + 389: reemplaza el placeholder de "Mapa de Calor". Dos pestañas:
 *  - "Densidad": `PropertyHeatmap` (ya cableado a `GET /propiedades`), solo faltaba montarlo.
 *  - "Mapa por estado": nuevo, usa `GET /admin/propiedades?estado=` (todas las propiedades, no
 *    solo pendientes) + `PropertiesMap` con `colorByEstado` para ver de un vistazo dónde se
 *    concentran los rechazos/pendientes vs. lo ya aprobado.
 */
export default function AdminHeatmapPage() {
  const [tab, setTab] = useState<Tab>('densidad');
  const [propiedades, setPropiedades] = useState<PropiedadAdminDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [cargadoAlMenosUnaVez, setCargadoAlMenosUnaVez] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminPropertyService.listarTodas(filtroEstado || undefined);
      setPropiedades(data);
    } finally {
      setLoading(false);
      setCargadoAlMenosUnaVez(true);
    }
  }, [filtroEstado]);

  // Carga perezosa: solo pide datos al backend cuando el admin abre la pestaña "Mapa por estado".
  useEffect(() => {
    if (tab === 'mapa') cargar();
  }, [tab, cargar]);

  const puntos: PropiedadMapa[] = propiedades
    .filter((p) => p.latitud != null && p.longitud != null)
    .map((p) => ({
      id: String(p.id),
      titulo: p.titulo,
      precio: Number(p.precio ?? 0),
      imagenes: p.imagenes ?? [],
      coordenadas: { lat: p.latitud as number, lng: p.longitud as number },
      estadoModeracion: p.estado,
    }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="text-primary font-bold tracking-wider uppercase text-[10px] mb-2 block">Torre de Control</span>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Mapa de Calor</h1>
          <p className="text-slate-400 font-semibold text-xs mt-2">
            Densidad de la oferta y estado de moderación de cada propiedad, geolocalizadas.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {(['densidad', 'mapa'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${
                tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t === 'densidad' ? 'Densidad' : 'Mapa por estado'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'densidad' ? (
        <PropertyHeatmap />
      ) : (
        <div className="space-y-4">
          {/* Filtro de estado + leyenda */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-md px-5 py-3">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {ESTADOS.map((estado) => (
                <button
                  key={estado || 'TODAS'}
                  onClick={() => setFiltroEstado(estado)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors ${
                    filtroEstado === estado ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {ETIQUETA_ESTADO[estado]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-5">
              {LEYENDA.map((l) => (
                <div key={l.estado} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-[600px] rounded-xl overflow-hidden border border-slate-200 relative">
            {loading || !cargadoAlMenosUnaVez ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <PropertiesMap
                propiedades={puntos}
                className="h-full w-full"
                colorByEstado
                hrefBuilder={(p) => `/admin-master/properties/to-review?id=${p.id}`}
              />
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {puntos.length} de {propiedades.length} propiedades tienen coordenadas registradas. Click en un pin para ir a su
            revisión.
          </p>
        </div>
      )}
    </div>
  );
}
