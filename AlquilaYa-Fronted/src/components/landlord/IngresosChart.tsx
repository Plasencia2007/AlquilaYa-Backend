'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { IngresoMensual } from '@/services/landlord-dashboard-service';

interface IngresosChartProps {
  data: IngresoMensual[];
}

const formatearMes = (mes: string) => {
  const [, mm] = mes.split('-');
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const idx = Number(mm) - 1;
  return nombres[idx] ?? mes;
};

export default function IngresosChart({ data }: IngresosChartProps) {
  const chartData = data.map((d) => ({
    mes: formatearMes(d.mes),
    monto: Number(d.monto) || 0,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            tickFormatter={(v: number) => `S/${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.05)',
              fontSize: 12,
              fontWeight: 700,
            }}
            formatter={(value: number) => [`S/ ${value.toFixed(2)}`, 'Ingresos']}
          />
          <Bar dataKey="monto" fill="#3B82F6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
