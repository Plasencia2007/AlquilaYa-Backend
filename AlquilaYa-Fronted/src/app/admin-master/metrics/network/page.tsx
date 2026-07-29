'use client';

import NetworkMetricsDashboard from '@/components/admin/NetworkMetricsDashboard';

/**
 * Ítem 352: `NetworkMetricsDashboard` ahora consulta datos reales vía
 * `/api/admin/network-metrics` (proxy server-side a Prometheus, `/actuator/prometheus` de cada
 * microservicio). El componente maneja sus 3 estados (cargando / disponible / Prometheus no
 * disponible) internamente con su propio banner — no hace falta un aviso de mock acá.
 */
export default function AdminNetworkMetricsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="mb-8">
        <span className="text-primary font-bold tracking-wider uppercase text-[10px] mb-2 block">Torre de Control</span>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Métricas de Red</h1>
        <p className="text-slate-400 font-semibold text-xs mt-2">
          Latencia, tráfico y códigos de respuesta de los microservicios (vía Prometheus).
        </p>
      </div>

      <NetworkMetricsDashboard />
    </div>
  );
}
