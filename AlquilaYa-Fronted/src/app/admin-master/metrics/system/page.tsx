'use client';

import SystemHealthDashboard from '@/components/admin/SystemHealthDashboard';

/** Ítem 352: reemplaza el placeholder — SystemHealthDashboard ya está cableado a datos reales
 *  (/api/admin/health, /api/admin/logs). Solo faltaba montarlo aquí. */
export default function AdminSystemMetricsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="mb-8">
        <span className="text-primary font-bold tracking-wider uppercase text-[10px] mb-2 block">Torre de Control</span>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Monitor del Sistema</h1>
        <p className="text-slate-400 font-semibold text-xs mt-2">
          Estado de los microservicios y latencia de la red AlquilaYa, vía Actuator del Gateway.
        </p>
      </div>
      <SystemHealthDashboard />
    </div>
  );
}
