'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PuntoMensual } from '@/services/landlord-dashboard-service';
import { CHART_MUTED_FOREGROUND } from '@/lib/chart-colors';

interface OcupacionChartProps {
  data: PuntoMensual[];
}

const formatearMes = (mes: string) => {
  const [, mm] = mes.split('-');
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const idx = Number(mm) - 1;
  return nombres[idx] ?? mes;
};

/**
 * Ítem 321: ocupación histórica retroactiva, junto al chart de ingresos en el dashboard.
 * Usa `CHART_MUTED_FOREGROUND` (en vez de `CHART_PRIMARY`, que ya usa IngresosChart) para
 * diferenciar visualmente ambas series sin hardcodear un hex nuevo.
 */
export default function OcupacionChart({ data }: OcupacionChartProps) {
  const chartData = data.map((d) => ({
    mes: formatearMes(d.mes),
    valor: Number(d.valor) || 0,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ocupacionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_MUTED_FOREGROUND} stopOpacity={0.35} />
              <stop offset="95%" stopColor={CHART_MUTED_FOREGROUND} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fontWeight: 700, fill: '#666' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#999' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
            domain={[0, 100]}
          />
          <Tooltip
            cursor={{ stroke: CHART_MUTED_FOREGROUND, strokeWidth: 1, strokeDasharray: '3 3' }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.05)',
              fontSize: 12,
              fontWeight: 700,
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Ocupación']}
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke={CHART_MUTED_FOREGROUND}
            strokeWidth={2}
            fill="url(#ocupacionFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
