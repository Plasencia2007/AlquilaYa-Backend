'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';

interface ServicioPunto {
  service: string;
  label: string;
}

interface LatenciaPunto extends ServicioPunto {
  ms: number;
}

interface TraficoPunto extends ServicioPunto {
  req: number;
}

interface EstadoPunto {
  name: string;
  value: number;
  color: string;
}

interface ResumenMetricas {
  latenciaMediaMs: number;
  peticionesPorSegundo: number;
  errores5xxPorcentaje: number;
  serviciosReportando: number;
  serviciosTotales: number;
}

interface NetworkMetricsResponse {
  disponible: boolean;
  motivo?: string;
  actualizadoEn?: string;
  latencia?: LatenciaPunto[];
  trafico?: TraficoPunto[];
  estados?: EstadoPunto[];
  resumen?: ResumenMetricas;
}

interface EstadoCarga<T> {
  data: T;
  loading: boolean;
}

const RESPUESTA_INICIAL: NetworkMetricsResponse = { disponible: false };

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 shadow-none rounded-lg">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-black text-primary">
          {payload[0].value} {payload[0].name === 'ms' ? 'ms' : 'req/s'}
        </p>
      </div>
    );
  }
  return null;
};

/** Placeholder para un chart sin datos (cargando o Prometheus no disponible) — nunca mock. */
const EstadoVacioChart = ({ loading }: { loading: boolean }) => (
  <div className="h-full flex items-center justify-center text-xs font-bold text-slate-300 uppercase tracking-widest">
    {loading ? 'Consultando Prometheus…' : 'Sin datos disponibles'}
  </div>
);

export default function NetworkMetricsDashboard() {
  const [metrics, setMetrics] = useState<EstadoCarga<NetworkMetricsResponse>>({
    data: RESPUESTA_INICIAL,
    loading: true,
  });

  const pedirDatos = (): Promise<NetworkMetricsResponse> =>
    fetch('/api/admin/network-metrics', { cache: 'no-store' })
      .then((res) => res.json() as Promise<NetworkMetricsResponse>)
      .catch(() => ({ disponible: false, motivo: 'No se pudo contactar al servidor.' }));

  // Botón "Actualizar": SÍ resetea `loading` antes de pedir de nuevo (click handler normal,
  // no un efecto, no viola react-hooks/set-state-in-effect).
  const cargar = () => {
    setMetrics((s) => ({ ...s, loading: true }));
    pedirDatos().then((data) => setMetrics({ data, loading: false }));
  };

  // Carga inicial: `.then()` INLINE en el efecto (no delegado a una función con nombre) —
  // mismo patrón que admin-master/alerts/page.tsx y admin-master/metrics/page.tsx.
  // react-hooks/set-state-in-effect es error en este proyecto y se dispara igual si el efecto
  // llama a una función con nombre, aunque esa función no haga ningún setState síncrono.
  useEffect(() => {
    let cancelado = false;
    pedirDatos().then((data) => {
      if (!cancelado) setMetrics({ data, loading: false });
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const { data, loading } = metrics;
  const disponible = data.disponible;
  const dataLatencia = data.latencia ?? [];
  const dataTrafico = data.trafico ?? [];
  const dataEstados = data.estados ?? [];
  const resumen = data.resumen;

  const statCards = [
    { label: 'Latencia Media', value: resumen ? `${resumen.latenciaMediaMs}ms` : '—' },
    { label: 'Servicios Reportando', value: resumen ? `${resumen.serviciosReportando}/${resumen.serviciosTotales}` : '—' },
    { label: 'Errores 5xx', value: resumen ? `${resumen.errores5xxPorcentaje}%` : '—' },
    { label: 'Peticiones/Seg', value: resumen ? `${resumen.peticionesPorSegundo}` : '—' },
  ];

  return (
    <div className="space-y-6">
      {/* Estado de conexión + refresh manual (dashboard on-demand, no polling) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${disponible ? 'bg-primary animate-pulse' : 'bg-slate-300'}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${disponible ? 'text-primary' : 'text-slate-400'}`}>
            {loading ? 'Consultando Prometheus…' : disponible ? 'Live' : 'Prometheus no disponible'}
          </span>
        </div>
        <button
          onClick={cargar}
          className="px-4 py-2 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {!loading && !disponible && (
        <div className="flex items-center gap-3 rounded-md border border-warning/20 bg-warning/5 px-5 py-3">
          <AlertTriangle size={18} className="text-warning shrink-0" />
          <div>
            <p className="text-xs font-bold text-warning uppercase tracking-wider">Prometheus no está disponible</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {data.motivo ?? 'No se pudo conectar con Prometheus.'} Corre{' '}
              <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">
                docker compose -f docker-compose.observability.yml up -d
              </code>{' '}
              para ver datos reales.
            </p>
          </div>
        </div>
      )}

      {/* Top Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-xl">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Chart */}
        <div className="bg-white border border-slate-200 p-8 rounded-xl h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Latencia por Servicio</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tiempo de respuesta medio (ventana 5 min)</p>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            {dataLatencia.length === 0 ? (
              <EstadoVacioChart loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataLatencia}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    name="ms"
                    type="monotone"
                    dataKey="ms"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0, fill: '#ef4444' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Traffic Chart */}
        <div className="bg-white border border-slate-200 p-8 rounded-xl h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Tráfico de Peticiones</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Requests/seg por servicio (ventana 5 min)</p>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            {dataTrafico.length === 0 ? (
              <EstadoVacioChart loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataTrafico}>
                  <defs>
                    <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8f0304" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#8f0304" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    name="req"
                    type="monotone"
                    dataKey="req"
                    stroke="#8f0304"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorReq)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* HTTP Status Distribution */}
      <div className="bg-white border border-slate-200 p-8 rounded-xl">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-8">Distribución de Estados HTTP</h3>
        {dataEstados.length === 0 || dataEstados.every((e) => e.value === 0) ? (
          <div className="h-[200px] flex items-center justify-center text-xs font-bold text-slate-300 uppercase tracking-widest">
            {loading ? 'Consultando Prometheus…' : 'Sin datos disponibles'}
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/3 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataEstados}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dataEstados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {dataEstados.map((estado, i) => (
                <div key={i} className="flex flex-col border-l-2 border-slate-100 pl-6 py-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{estado.name}</span>
                  <span className="text-2xl font-black text-slate-900">{estado.value}%</span>
                  <div className={`mt-3 h-1 w-12 rounded-full`} style={{ backgroundColor: estado.color }}></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
