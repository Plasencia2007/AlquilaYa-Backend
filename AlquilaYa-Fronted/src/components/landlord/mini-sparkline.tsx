'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { PuntoSerie } from '@/services/analytics-service';
import { CHART_PRIMARY } from '@/lib/chart-colors';

/**
 * Ítem 329: mini-sparkline de vistas (30 días) para las cards de "Mis propiedades".
 * Sin ejes, grilla ni tooltip — solo la tendencia a simple vista. Se importa con
 * `dynamic(..., { ssr: false })` desde el caller (mismo patrón que VistasChart) porque
 * Recharts no soporta SSR en este proyecto.
 */
export default function MiniSparkline({ data }: { data: PuntoSerie[] }) {
  if (!data || data.length < 2) {
    return <div className="h-5 w-[60px]" />;
  }
  const chartData = data.map((d) => ({ valor: d.valor }));
  return (
    <div className="h-5 w-[60px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 1, left: 1, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="valor"
            stroke={CHART_PRIMARY}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
