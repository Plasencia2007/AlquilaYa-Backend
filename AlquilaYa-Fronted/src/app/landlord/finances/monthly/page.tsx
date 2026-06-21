'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/components/ui/legacy-card';
import { notify } from '@/lib/notify';
import { reservationService } from '@/services/reservation-service';
import type { Reserva } from '@/types/reserva';

interface FilaMensual {
  mes: string; // YYYY-MM
  etiqueta: string; // ej. "abr 2026"
  reservas: number;
  total: number; // ingreso del arrendador (montoTotal, sin comisión)
  comision: number; // comisión de plataforma que pagó el estudiante (informativo)
}

const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function formatearMoneda(n: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(n);
}

function agruparPorMes(reservas: Reserva[]): FilaMensual[] {
  const mapa = new Map<string, FilaMensual>();
  for (const r of reservas) {
    // Usamos `fechaInicio` como aproximación del mes en el que el ingreso se
    // imputa cuando no hay `fechaPago` disponible en el DTO.
    const base = r.fechaInicio || r.fechaCreacion;
    if (!base) continue;
    const d = new Date(base);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const etiqueta = `${MESES[d.getMonth()]} ${d.getFullYear()}`;
    const fila = mapa.get(key) ?? { mes: key, etiqueta, reservas: 0, total: 0, comision: 0 };
    fila.reservas += 1;
    fila.total += Number(r.montoTotal ?? 0);
    fila.comision += Number(r.comision ?? 0);
    mapa.set(key, fila);
  }
  return Array.from(mapa.values()).sort((a, b) => a.mes.localeCompare(b.mes));
}

export default function LandlordFinancesMonthlyPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    reservationService
      .listarComoArrendador('PAGADA')
      .then((data) => {
        if (!cancelado) setReservas(data);
      })
      .catch((err) => notify.error(err, 'No se pudieron cargar los ingresos'))
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const filas = useMemo(() => agruparPorMes(reservas), [reservas]);
  const total = useMemo(() => filas.reduce((acc, f) => acc + f.total, 0), [filas]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter opacity-90">
            Ingresos mensuales
          </h1>
          <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
            Reservas pagadas agrupadas por mes.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Total general
          </p>
          <p className="text-3xl font-black text-primary">{formatearMoneda(total)}</p>
        </div>
      </header>

      <Card className="bg-white/40 border border-border p-6">
        <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-4">
          Evolución de ingresos
        </h3>
        <div className="h-72 w-full">
          {filas.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {cargando ? 'Cargando…' : 'Aún no tienes ingresos registrados.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filas}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => formatearMoneda(Number(v))}
                  labelStyle={{ fontWeight: 700 }}
                />
                <Bar dataKey="total" fill="#8f0304" radius={[6, 6, 0, 0]} />
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
              <th className="text-right px-6 py-3 font-black">Reservas</th>
              <th className="text-right px-6 py-3 font-black">Comisión plataforma</th>
              <th className="text-right px-6 py-3 font-black">Tu ingreso</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.mes} className="border-t border-border">
                <td className="px-6 py-3 font-bold text-foreground/80 capitalize">{f.etiqueta}</td>
                <td className="px-6 py-3 text-right font-medium">{f.reservas}</td>
                <td className="px-6 py-3 text-right font-medium text-muted-foreground">
                  {f.comision > 0 ? formatearMoneda(f.comision) : '—'}
                </td>
                <td className="px-6 py-3 text-right font-black text-primary">
                  {formatearMoneda(f.total)}
                </td>
              </tr>
            ))}
            {filas.length === 0 && !cargando && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-muted-foreground">
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
