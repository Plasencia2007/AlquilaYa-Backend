'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, CalendarClock } from 'lucide-react';
import { servicioPropiedades, type RangoOcupado } from '@/services/property-service';
import { formatearFecha } from '@/lib/relative-time';

/**
 * Muestra la disponibilidad de la propiedad a partir de los rangos ocupados por reservas
 * activas (`GET /propiedades/{id}/calendario`). Si no hay rangos → "Disponible ahora".
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

  if (rangos === null) {
    return <div className="h-16 animate-pulse rounded-2xl bg-muted" />;
  }

  if (rangos.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success-light px-4 py-3">
        <CalendarCheck className="size-5 shrink-0 text-success" aria-hidden />
        <p className="text-sm font-semibold text-success">
          Disponible ahora — sin reservas en agenda.
        </p>
      </div>
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ocupadoHoy = rangos.some((r) => {
    const d = new Date(r.desde + 'T00:00:00');
    const h = new Date(r.hasta + 'T00:00:00');
    return d <= hoy && hoy <= h;
  });

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm font-bold text-foreground">
          {ocupadoHoy ? 'Ocupado actualmente' : 'Disponible ahora'}
        </p>
      </div>
      <ul className="space-y-1.5">
        {rangos.map((r, i) => (
          <li key={`${r.desde}-${r.hasta}-${i}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {formatearFecha(r.desde)} <span className="text-muted-foreground/60">→</span> {formatearFecha(r.hasta)}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Ocupado
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
