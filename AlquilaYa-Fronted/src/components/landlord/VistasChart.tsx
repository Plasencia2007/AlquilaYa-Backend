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
import type { PuntoSerie } from '@/services/analytics-service';
import { CHART_PRIMARY } from '@/lib/chart-colors';

const formatearDia = (iso: string) => {
  const [, mm, dd] = iso.split('-');
  return `${dd}/${mm}`;
};

export default function VistasChart({ data }: { data: PuntoSerie[] }) {
  const chartData = data.map((d) => ({ dia: formatearDia(d.fecha), valor: d.valor, iso: d.fecha }));

  return (
    <div className="w-full h-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gVistas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 10, fill: '#999' }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#999' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.05)',
              fontSize: 12,
              fontWeight: 700,
            }}
            formatter={(value) => [`${value} vistas`, '']}
            labelFormatter={(label) => `Día ${label}`}
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke={CHART_PRIMARY}
            strokeWidth={2}
            fill="url(#gVistas)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
