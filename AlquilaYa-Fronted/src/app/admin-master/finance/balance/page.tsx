'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/components/ui/legacy-card';
import { notify } from '@/lib/notify';
import { pagoService, type ResumenFinanciero } from '@/services/pago-service';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatearMoneda(n: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(n);
}

function etiquetaMes(mes: string): string {
  const [anio, m] = mes.split('-');
  const idx = Number(m) - 1;
  return idx >= 0 && idx < 12 ? `${MESES[idx]} ${anio}` : mes;
}

export default function AdminBalancePage() {
  const [resumen, setResumen] = useState<ResumenFinanciero | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    pagoService
      .obtenerResumenFinanciero()
      .then((data) => {
        if (!cancelado) setResumen(data);
      })
      .catch((err) => notify.error(err, 'No se pudo cargar el balance'))
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const filas = useMemo(
    () =>
      (resumen?.porMes ?? []).map((m) => ({
        ...m,
        etiqueta: etiquetaMes(m.mes),
      })),
    [resumen],
  );

  const tarjetas = [
    {
      label: 'Ingreso de plataforma (comisiones)',
      valor: resumen?.totalComision ?? 0,
      color: 'text-emerald-600',
    },
    {
      label: 'Total cobrado a estudiantes',
      valor: resumen?.totalCobrado ?? 0,
      color: 'text-primary',
    },
    {
      label: 'Pagado a arrendadores',
      valor: resumen?.totalArrendador ?? 0,
      color: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter opacity-90">
            Balance General
          </h1>
          <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
            Ingresos por comisión y volumen transado en la plataforma.{' '}
            {resumen ? `${resumen.numPagos} pago(s) confirmado(s).` : ''}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tarjetas.map((t) => (
          <Card key={t.label} className="bg-white/40 border border-border p-5">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.label}
            </p>
            <p className={`text-3xl font-black mt-1 ${t.color}`}>
              {cargando ? '…' : formatearMoneda(t.valor)}
            </p>
          </Card>
        ))}
      </div>

      <Card className="bg-white/40 border border-border p-6">
        <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-4">
          Comisión vs. pago a arrendadores por mes
        </h3>
        <div className="h-72 w-full">
          {filas.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {cargando ? 'Cargando…' : 'Aún no hay pagos confirmados.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filas}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatearMoneda(Number(v))} labelStyle={{ fontWeight: 700 }} />
                <Legend />
                <Bar dataKey="arrendador" name="Arrendadores" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="comision" name="Comisión" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card padding="none" className="bg-white/40 border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-[10px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-6 py-3 font-black">Mes</th>
              <th className="text-right px-6 py-3 font-black">Pagos</th>
              <th className="text-right px-6 py-3 font-black">Cobrado</th>
              <th className="text-right px-6 py-3 font-black">Comisión</th>
              <th className="text-right px-6 py-3 font-black">Arrendadores</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.mes} className="border-t border-border">
                <td className="px-6 py-3 font-bold text-foreground/80 capitalize">{f.etiqueta}</td>
                <td className="px-6 py-3 text-right font-medium">{f.numPagos}</td>
                <td className="px-6 py-3 text-right font-medium text-primary">{formatearMoneda(f.cobrado)}</td>
                <td className="px-6 py-3 text-right font-black text-emerald-600">{formatearMoneda(f.comision)}</td>
                <td className="px-6 py-3 text-right font-medium text-muted-foreground">
                  {formatearMoneda(f.arrendador)}
                </td>
              </tr>
            ))}
            {filas.length === 0 && !cargando && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-muted-foreground">
                  Sin datos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
