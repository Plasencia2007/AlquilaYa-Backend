'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '@/hooks/use-auth';
import { formatPEN } from '@/lib/money';
import { notify } from '@/lib/notify';
import { reservationService } from '@/services/reservation-service';
import type { Reserva } from '@/types/reserva';

interface FilaPropiedad {
  propiedadId: string;
  titulo: string;
  reservas: number;
  total: number;
  promedio: number;
}

/** Ítem 320: mismos presets "hacia atrás" que `finances/monthly` (los de
 *  `DEFAULT_DATE_RANGE_PRESETS` apuntan a fechas futuras de reserva, no sirven acá). */
const PRESETS_FINANZAS: DateRangePreset[] = [
  { label: 'Este mes', range: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  {
    label: 'Este trimestre',
    range: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }),
  },
  { label: 'Este año', range: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

function fechaEfectiva(r: Reserva): Date | null {
  const base = r.fechaInicio || r.fechaCreacion;
  if (!base) return null;
  const d = new Date(base);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function LandlordFinancesPerRoomPage() {
  const { usuario } = useAuth();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rango, setRango] = useState<DateRange | undefined>(undefined);
  // Ítem 344: filtro de propiedad centralizado (workspace switcher), compartido con
  // `finances/monthly`. El catálogo id→título del arrendador también sale de acá — reemplaza el
  // fetch propio que esta página le hacía a `propiedadService.obtenerPorArrendador` (mismo
  // catálogo que ya carga el switcher, se evita duplicar la llamada).
  const { propiedadId, propiedades: propiedadesArrendador } = useLandlordPropertyFilter();
  const titulos = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const p of propiedadesArrendador) mapa[p.id] = p.titulo;
    return mapa;
  }, [propiedadesArrendador]);

  useEffect(() => {
    let cancelado = false;
    if (!usuario?.perfilId) return;

    // No hay `setCargando(true)` síncrono acá a propósito (regla `react-hooks/set-state-in-effect`):
    // `cargando` ya inicializa en `true`, y este efecto solo vuelve a correr si cambia
    // `usuario.perfilId` (re-login), caso borde donde como mucho se pierde el parpadeo de
    // "Cargando…" — los datos igual se refrescan al resolver la promesa.
    reservationService
      .listarComoArrendador('PAGADA')
      .then((listaReservas) => {
        if (cancelado) return;
        setReservas(listaReservas);
      })
      .catch((err) => notify.error(err, 'No se pudieron cargar las finanzas'))
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [usuario?.perfilId]);

  const reservasFiltradas = useMemo(() => {
    return reservas.filter((r) => {
      if (propiedadId !== TODAS_LAS_PROPIEDADES && String(r.propiedadId) !== propiedadId) return false;
      if (rango?.from) {
        const d = fechaEfectiva(r);
        if (!d) return false;
        const desde = startOfDay(rango.from);
        const hasta = rango.to ? endOfDay(rango.to) : endOfDay(rango.from);
        if (!isWithinInterval(d, { start: desde, end: hasta })) return false;
      }
      return true;
    });
  }, [reservas, propiedadId, rango]);

  const filas = useMemo<FilaPropiedad[]>(() => {
    const mapa = new Map<string, FilaPropiedad>();
    for (const r of reservasFiltradas) {
      const id = String(r.propiedadId);
      const fila = mapa.get(id) ?? {
        propiedadId: id,
        titulo: titulos[id] ?? r.propiedadTitulo ?? `Propiedad #${id}`,
        reservas: 0,
        total: 0,
        promedio: 0,
      };
      fila.reservas += 1;
      fila.total += Number(r.montoTotal ?? 0);
      // Mantener el título más fresco (cuando llega del catálogo)
      if (titulos[id]) fila.titulo = titulos[id];
      mapa.set(id, fila);
    }
    const arr = Array.from(mapa.values()).map((f) => ({
      ...f,
      promedio: f.reservas > 0 ? f.total / f.reservas : 0,
    }));
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [reservasFiltradas, titulos]);

  const total = useMemo(() => filas.reduce((acc, f) => acc + f.total, 0), [filas]);
  const totalReservas = useMemo(() => filas.reduce((acc, f) => acc + f.reservas, 0), [filas]);

  const exportarCsv = () => {
    if (filas.length === 0) {
      notify.warning('No hay datos para exportar con los filtros actuales.');
      return;
    }
    const filasCsv: (string | number)[][] = filas.map((f) => [
      f.titulo,
      f.reservas,
      f.total.toFixed(2),
      f.promedio.toFixed(2),
    ]);
    filasCsv.push(['TOTAL', totalReservas, total.toFixed(2), (total / (totalReservas || 1)).toFixed(2)]);
    descargarCsv(
      `ingresos-por-propiedad-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Propiedad', 'Reservas', 'Total (S/)', 'Promedio (S/)'],
      filasCsv,
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter opacity-90">
            Ingresos por propiedad
          </h1>
          <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
            Comparativo de cuánto está aportando cada habitación o propiedad.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Total general
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

      <Card padding="none" className="bg-white/40 border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-[10px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-6 py-3 font-black">Propiedad</th>
              <th className="text-right px-6 py-3 font-black">Reservas</th>
              <th className="text-right px-6 py-3 font-black">Total</th>
              <th className="text-right px-6 py-3 font-black">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.propiedadId} className="border-t border-border">
                <td className="px-6 py-3 font-bold text-foreground/80">{f.titulo}</td>
                <td className="px-6 py-3 text-right font-medium">{f.reservas}</td>
                <td className="px-6 py-3 text-right">
                  <Money value={f.total} size="sm" className="text-primary" />
                </td>
                <td className="px-6 py-3 text-right font-medium">
                  {formatPEN(f.promedio)}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-muted-foreground">
                  {cargando ? 'Cargando…' : 'No hay ingresos para los filtros seleccionados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
