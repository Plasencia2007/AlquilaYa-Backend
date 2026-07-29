'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CalendarClock } from 'lucide-react';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { servicioPropiedades, type RangoOcupado } from '@/services/property-service';
import { Calendar } from '@/components/ui/calendar';

function parseFechaLocal(fecha: string): Date {
  return new Date(`${fecha}T00:00:00`);
}

/**
 * Muestra la disponibilidad de la propiedad a partir de los rangos ocupados por reservas
 * activas (`GET /propiedades/{id}/calendario`). Si no hay rangos → "Disponible ahora".
 * Además del badge de estado, pinta un calendario de solo-lectura (`DayPicker`) marcando
 * los días ocupados vs. libres, con leyenda.
 */
export function AvailabilityPanel({ propiedadId }: { propiedadId: string | number }) {
  const [rangos, setRangos] = useState<RangoOcupado[] | null>(null);

  useEffect(() => {
    let cancel = false;
    servicioPropiedades
      .obtenerCalendario(propiedadId)
      .then((r) => { if (!cancel) setRangos(r); })
      .catch(() => { if (!cancel) setRangos([]); });
    return () => { cancel = true; };
  }, [propiedadId]);

  const rangosOcupados = useMemo<DateRange[]>(
    () => (rangos ?? []).map((r) => ({ from: parseFechaLocal(r.desde), to: parseFechaLocal(r.hasta) })),
    [rangos],
  );

  const estaOcupado = useMemo(
    () => (date: Date) => rangosOcupados.some((r) => r.from && r.to && date >= r.from && date <= r.to),
    [rangosOcupados],
  );

  if (rangos === null) {
    return <div className="h-16 animate-pulse rounded-2xl bg-muted" />;
  }

  const sinReservas = rangos.length === 0;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ocupadoHoy = rangos.some((r) => {
    const d = parseFechaLocal(r.desde);
    const h = parseFechaLocal(r.hasta);
    return d <= hoy && hoy <= h;
  });

  if (sinReservas) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success-light px-4 py-3">
        <CalendarCheck className="size-5 shrink-0 text-success" aria-hidden />
        <p className="text-sm font-semibold text-success">
          Disponible ahora — sin reservas en agenda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm font-bold text-foreground">
          {ocupadoHoy ? 'Ocupado actualmente' : 'Disponible ahora'}
        </p>
      </div>

      <Calendar
        locale={es}
        showOutsideDays={false}
        defaultMonth={hoy}
        modifiers={{
          ocupado: rangosOcupados,
          disponible: (date: Date) => !estaOcupado(date),
        }}
        modifiersClassNames={{
          ocupado: 'bg-destructive/15 text-destructive font-bold',
          disponible: 'text-success',
        }}
        className="mx-auto"
      />

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-destructive" aria-hidden />
          Ocupado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          Disponible
        </span>
      </div>
    </div>
  );
}
