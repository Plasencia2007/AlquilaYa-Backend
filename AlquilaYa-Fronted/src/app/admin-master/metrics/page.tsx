'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { StatCard } from '@/components/shared/stat-card';
import { adminMetricasService, MetricasAgregado } from '@/services/admin-metricas-service';
import { CHART_PRIMARY, CHART_MUTED_FOREGROUND } from '@/lib/chart-colors';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const formatearSoles = (valor?: number | null) => `S/ ${Number(valor || 0).toLocaleString('es-PE')}`;

const formatearMes = (mes: string) => {
  const [, mm] = mes.split('-');
  const idx = Number(mm) - 1;
  return MESES[idx] ?? mes;
};

const formatearSemana = (iso: string) => {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
};

interface EstadoCarga<T> {
  data: T;
  loading: boolean;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter: (v: number) => string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-xs font-bold" style={{ color: p.color }}>
          {p.name}: {formatter(p.value)}
        </p>
      ))}
    </div>
  );
};

/**
 * Ítem 353 + 386 + 354: dashboard de métricas real. Antes hacía 6 llamadas client-side por
 * separado (una por microservicio, vía `Promise.allSettled`); desde el ítem 354 usa el endpoint
 * agregado `GET /usuarios/admin/metricas` (`AdminMetricasController#metricasAgregadas` en
 * servicio-usuarios), que arma el response del lado del backend y ya degrada solo: si
 * servicio-pagos o servicio-propiedades están caídos, esa sección llega `null`/vacía en vez de
 * tumbar el resto — mismo espíritu que el `Promise.allSettled` que reemplaza.
 */
export default function MetricsPage() {
  const [metricas, setMetricas] = useState<EstadoCarga<MetricasAgregado | null>>({ data: null, loading: true });

  const pedirDatos = () => adminMetricasService.obtenerMetricasAgregadas();

  // Botón "Actualizar": resetea `loading` antes de pedir de nuevo — un click handler
  // normal, no un efecto, así que resetear acá no viola la regla de abajo.
  const cargar = () => {
    setMetricas((s) => ({ ...s, loading: true }));
    pedirDatos()
      .then((data) => setMetricas({ data, loading: false }))
      .catch(() => setMetricas({ data: null, loading: false }));
  };

  // Carga inicial: `.then()`/`.catch()` INLINE en el efecto (no delegados a una función con
  // nombre) — llamar a una función con nombre desde el efecto dispara
  // `react-hooks/set-state-in-effect` aunque esa función no haga ningún setState síncrono (el
  // linter no distingue "antes" vs "después" de un await dentro de una función referenciada) —
  // solo la cadena `.then()` literal en el cuerpo del efecto lo satisface.
  useEffect(() => {
    let cancelado = false;
    pedirDatos()
      .then((data) => {
        if (!cancelado) setMetricas({ data, loading: false });
      })
      .catch(() => {
        if (!cancelado) setMetricas({ data: null, loading: false });
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const cargando = metricas.loading;
  const data = metricas.data;

  const resumen = data?.resumenFinanciero ?? null;
  const estudiantes = data?.estudiantes ?? 0;
  const arrendadores = data?.arrendadores ?? 0;
  const admins = data?.admins ?? 0;
  // `propiedadesPendientes` llega `null` si servicio-propiedades estaba caído al calcular el
  // agregado (ver AdminMetricasAgregadoService) — se muestra como 0 en vez de distinguirlo, igual
  // que el resto de tarjetas de esta página ante una sección sin datos.
  const pendientes = data?.propiedadesPendientes ?? 0;
  const registros = data?.registrosPorSemana ?? [];

  const totalUsuarios = estudiantes + arrendadores + admins;
  const valor = (n: number) => (cargando ? '—' : n.toLocaleString('es-PE'));

  const dataUsuarios = [
    { rol: 'Estudiantes', total: estudiantes },
    { rol: 'Arrendadores', total: arrendadores },
    { rol: 'Admins', total: admins },
  ];

  const dataIngresos = (resumen?.porMes ?? []).map((m) => ({
    mes: formatearMes(m.mes),
    cobrado: m.cobrado,
    comision: m.comision,
  }));

  const dataCrecimiento = registros
    .filter((r) => r.semana)
    .map((r) => ({ semana: formatearSemana(r.semana), total: r.total }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <span className="text-primary font-bold tracking-wider uppercase text-[10px] mb-2 block">Torre de Control</span>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Métricas de la Plataforma</h1>
          <p className="text-slate-400 font-semibold text-xs mt-2">
            Ingresos, comisiones, crecimiento de usuarios y cola de moderación, en un solo panel.
          </p>
        </div>
        <button
          onClick={cargar}
          className="px-4 py-2.5 rounded-md bg-white border border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="payments"
          label="Total cobrado"
          value={cargando ? '—' : formatearSoles(resumen?.totalCobrado)}
          deltaLabel={`${valor(resumen?.numPagos ?? 0)} pagos`}
        />
        <StatCard
          icon="percent"
          label="Comisión de plataforma"
          value={cargando ? '—' : formatearSoles(resumen?.totalComision)}
          deltaLabel={cargando ? '' : `${formatearSoles(resumen?.totalArrendador)} a arrendadores`}
        />
        <StatCard
          icon="group"
          label="Usuarios totales"
          value={valor(totalUsuarios)}
          deltaLabel={`${valor(estudiantes)} estudiantes · ${valor(arrendadores)} arrendadores`}
        />
        <StatCard
          icon="fact_check"
          label="Propiedades pendientes"
          value={valor(pendientes)}
          deltaLabel="requieren revisión"
          href="/admin-master/properties/to-review"
          accent={!cargando && pendientes > 0 ? 'warning' : 'primary'}
        />
      </div>

      {/* Ingresos por mes + Usuarios por rol */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-slate-200 p-8 rounded-xl h-[380px] flex flex-col">
          <div className="mb-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Ingresos por mes</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cobrado a estudiantes vs. comisión retenida</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataIngresos}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                />
                <Tooltip content={<CustomTooltip formatter={formatearSoles} />} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }} />
                <Bar name="Cobrado" dataKey="cobrado" fill={CHART_PRIMARY} radius={[6, 6, 0, 0]} />
                <Bar name="Comisión" dataKey="comision" fill={CHART_MUTED_FOREGROUND} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-8 rounded-xl h-[380px] flex flex-col">
          <div className="mb-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Usuarios por rol</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cuentas registradas, sin filtrar por estado</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataUsuarios} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <YAxis
                  type="category"
                  dataKey="rol"
                  axisLine={false}
                  tickLine={false}
                  width={90}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip formatter={(v) => v.toLocaleString('es-PE')} />} />
                <Bar name="Usuarios" dataKey="total" fill={CHART_PRIMARY} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Crecimiento semanal de usuarios (ítem 386) */}
      <div className="bg-white border border-slate-200 p-8 rounded-xl h-[340px] flex flex-col">
        <div className="mb-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Crecimiento de usuarios</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nuevos registros por semana</p>
        </div>
        <div className="flex-1 w-full min-h-0">
          {!cargando && dataCrecimiento.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-bold text-slate-300 uppercase tracking-widest">
              Sin registros en el rango
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataCrecimiento}>
                <defs>
                  <linearGradient id="colorRegistros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v} registros`} />} />
                <Area
                  name="Registros"
                  type="monotone"
                  dataKey="total"
                  stroke={CHART_PRIMARY}
                  strokeWidth={3}
                  fill="url(#colorRegistros)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
