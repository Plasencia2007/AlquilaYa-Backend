'use client';

import StatsCard from '@/components/admin/StatsCard';
import StatusBadge from '@/components/admin/StatusBadge';
import { METRICAS_ADMIN, ACTIVIDADES_RECIENTES } from '@/mocks';

const ICONOS_METRICAS = ['group', 'apartment', 'calendar_check', 'payments'];

export default function AdminDashboard() {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
        <div>
          <span className="text-primary font-bold tracking-[0.2em] uppercase text-[10px] mb-2 block">Resumen de Operaciones</span>
          <h1 className="text-4xl font-black text-on-surface tracking-tighter">Panel de Control</h1>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-3 rounded-full bg-surface-container-high text-on-surface font-bold text-xs hover:bg-surface-container-highest transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">download</span>
            Descargar Reporte
          </button>
          <button className="px-6 py-3 rounded-full bg-primary text-on-primary font-bold text-xs hover:shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span>
            Nueva Propiedad
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {METRICAS_ADMIN.map((metrica, i) => (
          <StatsCard 
            key={metrica.etiqueta} 
            {...metrica} 
            icon={ICONOS_METRICAS[i]} 
          />
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="bg-surface-container-lowest rounded-[2.5rem] editorial-shadow border border-outline-variant/10 overflow-hidden">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
          <h2 className="text-lg font-black text-on-surface tracking-tight">Actividad Reciente</h2>
          <button className="text-primary text-xs font-bold hover:underline">Ver todo</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/5 text-outline text-[11px] font-black uppercase tracking-widest bg-surface-container-low/10">
                <th className="px-8 py-5">Descripción del Evento</th>
                <th className="px-8 py-5">Usuario</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5">Registro Horario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {ACTIVIDADES_RECIENTES.map(actividad => (
                <tr key={actividad.id} className="hover:bg-surface-container-low/50 transition-colors group">
                  <td className="px-8 py-5 text-sm font-bold text-on-surface leading-snug max-w-md">
                    {actividad.descripcion}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-secondary-container/30 rounded-full flex items-center justify-center text-[10px] font-black text-on-secondary-container">
                        {actividad.usuario.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-on-surface-variant">{actividad.usuario}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <StatusBadge status={actividad.estado as any} />
                  </td>
                  <td className="px-8 py-5 text-xs text-outline font-medium">
                    {actividad.fechaHora}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
