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
import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/legacy-card';
import { DateRangePicker, type DateRangePreset } from '@/components/ui/date-range-picker';
import { Money } from '@/components/ui/money';
import { descargarCsv } from '@/lib/csv';
import { LandlordPropertySwitcher } from '@/components/landlord/landlord-property-switcher';
import { useLandlordPropertyFilter } from '@/hooks/use-landlord-property-filter';
import { TODAS_LAS_PROPIEDADES } from '@/stores/landlord-property-filter-store';
import { formatPEN } from '@/lib/money';
import { notify } from '@/lib/notify';
import { pagoService, type PagoHistorialArrendador } from '@/services/pago-service';

interface FilaMensual {
  mes: string; // YYYY-MM
  etiqueta: string; // ej. "abr 2026"
  reservas: number;
  total: number; // ingreso del arrendador (montoArrendador, sin comisión de plataforma)
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

/** Ítem 320: presets propios (no los de `DEFAULT_DATE_RANGE_PRESETS`, pensados para elegir
 *  fechas FUTURAS de una reserva) — acá filtramos ingresos ya cobrados, así que miran hacia
 *  atrás/al período actual. */
const PRESETS_FINANZAS: DateRangePreset[] = [
  { label: 'Este mes', range: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  {
    label: 'Este trimestre',
    range: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }),
  },
  { label: 'Este año', range: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

/** Ítem 318: `fechaPago` es la fecha REAL en la que Mercado Pago confirmó el cobro (columna
 *  `fecha_pago` de la entidad `Pago`, poblada por el webhook). Cae a `fechaCreacion` solo por
 *  robustez ante datos legacy/inconsistentes — todo pago en estado PAGADO debería traer fechaPago. */
function fechaEfectiva(p: PagoHistorialArrendador): Date | null {
  const base = p.fechaPago ?? p.fechaCreacion;
  if (!base) return null;
  const d = new Date(base);
  return Number.isNaN(d.getTime()) ? null : d;
}

function agruparPorMes(pagos: PagoHistorialArrendador[]): FilaMensual[] {
  const mapa = new Map<string, FilaMensual>();
  for (const p of pagos) {
    const d = fechaEfectiva(p);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const etiqueta = `${MESES[d.getMonth()]} ${d.getFullYear()}`;
    const fila = mapa.get(key) ?? { mes: key, etiqueta, reservas: 0, total: 0, comision: 0 };
    fila.reservas += 1;
    fila.total += Number(p.montoArrendador ?? 0);
    fila.comision += Number(p.comision ?? 0);
    mapa.set(key, fila);
  }
  return Array.from(mapa.values()).sort((a, b) => a.mes.localeCompare(b.mes));
}

export default function LandlordFinancesMonthlyPage() {
  const [pagos, setPagos] = useState<PagoHistorialArrendador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rango, setRango] = useState<DateRange | undefined>(undefined);
  // Ítem 344: filtro de propiedad centralizado (workspace switcher), compartido con
  // `finances/per-room` — reemplaza el `<Select>` local que este archivo tenía antes.
  const { propiedadId } = useLandlordPropertyFilter();

  useEffect(() => {
    let cancelado = false;
    // No hace falta `setCargando(true)` acá: el estado ya inicializa en `true` y este efecto
    // corre una sola vez (deps `[]`) — llamarlo de nuevo dispararía un render en cascada
    // (regla `react-hooks/set-state-in-effect`).
    pagoService
      .listarHistorialArrendador()
      .then((data) => {
        if (!cancelado) setPagos(data);
      })
      .catch((err) => notify.error(err, 'No se pudieron cargar los ingresos'))
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Ítem 344: ahora que el DTO trae `propiedadId` (antes solo `propiedadTitulo`), el filtro
  // compara por id — igual que `finances/per-room`, y consistente con el selector global.
  const pagosFiltrados = useMemo(() => {
    return pagos.filter((p) => {
      if (propiedadId !== TODAS_LAS_PROPIEDADES && String(p.propiedadId ?? '') !== propiedadId) {
        return false;
      }
      if (rango?.from) {
        const d = fechaEfectiva(p);
        if (!d) return false;
        const desde = startOfDay(rango.from);
        const hasta = rango.to ? endOfDay(rango.to) : endOfDay(rango.from);
        if (!isWithinInterval(d, { start: desde, end: hasta })) return false;
      }
      return true;
    });
  }, [pagos, propiedadId, rango]);

  const filas = useMemo(() => agruparPorMes(pagosFiltrados), [pagosFiltrados]);
  const total = useMemo(() => filas.reduce((acc, f) => acc + f.total, 0), [filas]);
  const totalComision = useMemo(() => filas.reduce((acc, f) => acc + f.comision, 0), [filas]);
  const totalReservas = useMemo(() => filas.reduce((acc, f) => acc + f.reservas, 0), [filas]);

  const exportarCsv = () => {
    if (filas.length === 0) {
      notify.warning('No hay datos para exportar con los filtros actuales.');
      return;
    }
    const filasCsv: (string | number)[][] = filas.map((f) => [
      f.etiqueta,
      f.reservas,
      f.comision.toFixed(2),
      f.total.toFixed(2),
    ]);
    filasCsv.push(['TOTAL', totalReservas, totalComision.toFixed(2), total.toFixed(2)]);
    descargarCsv(
      `ingresos-mensuales-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Mes', 'Reservas', 'Comision plataforma (S/)', 'Tu ingreso (S/)'],
      filasCsv,
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter opacity-90">
            Ingresos mensuales
          </h1>
          <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
            Pagos confirmados agrupados por mes, según la fecha real en que se cobraron.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Total del período
          </p>
          <Money value={total} size="lg" className="text-primary" />
        </div>
      </header>

      <Card className="bg-white/40 border border-border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Rango de fechas
            </label>
            <DateRangePicker
              value={rango}
              onChange={setRango}
              presets={PRESETS_FINANZAS}
              placeholder="Todo el historial"
            />
          </div>
          <div className="min-w-[200px]">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Propiedad
            </label>
            <LandlordPropertySwitcher />
          </div>
          {rango?.from && (
            <Button type="button" variant="outline" className="h-10" onClick={() => setRango(undefined)}>
              Limpiar fechas
            </Button>
          )}
          <Button type="button" variant="outline" className="h-10 gap-2 ml-auto" onClick={exportarCsv}>
            <Download className="size-4" /> Exportar CSV
          </Button>
        </div>
      </Card>

      <Card className="bg-white/40 border border-border p-6">
        <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-4">
          Evolución de ingresos
        </h3>
        <div className="h-72 w-full">
          {filas.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {cargando ? 'Cargando…' : 'No hay ingresos para los filtros seleccionados.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filas}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => formatPEN(Number(v))}
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
                  {f.comision > 0 ? formatPEN(f.comision) : '—'}
                </td>
                <td className="px-6 py-3 text-right">
                  <Money value={f.total} size="sm" className="text-primary" />
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
