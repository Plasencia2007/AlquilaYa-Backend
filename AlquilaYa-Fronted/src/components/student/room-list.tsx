'use client';

import { useEffect, useState } from 'react';
import { habitacionService } from '@/services/habitacion-service';
import { ReservationFormDialog } from '@/components/student/reservation-form-dialog';
import { Button } from '@/components/ui/button';
import type { EstadoHabitacion, Habitacion, Propiedad } from '@/types/propiedad';

const ESTADO_META: Record<EstadoHabitacion, { label: string; cls: string }> = {
  LIBRE: { label: 'Libre', cls: 'text-[var(--color-success)] bg-[var(--color-success-light)]' },
  RESERVADA: { label: 'Reservada', cls: 'text-amber-600 bg-amber-500/10' },
  OCUPADA: { label: 'Ocupada', cls: 'text-destructive bg-destructive/10' },
  MANTENIMIENTO: { label: 'Mantenimiento', cls: 'text-muted-foreground bg-muted' },
};

/** Lista las habitaciones reservables de un inmueble gestionado por habitaciones. */
export function RoomList({ propiedad }: { propiedad: Propiedad }) {
  const [rooms, setRooms] = useState<Habitacion[] | null>(null);

  useEffect(() => {
    let cancel = false;
    habitacionService
      .listar(propiedad.id)
      .then((r) => { if (!cancel) setRooms(r); })
      .catch(() => { if (!cancel) setRooms([]); });
    return () => { cancel = true; };
  }, [propiedad.id]);

  if (rooms === null) {
    return <div className="h-20 animate-pulse rounded-2xl bg-muted" />;
  }
  if (rooms.length === 0) {
    return <p className="text-sm text-muted-foreground">Este inmueble aún no tiene habitaciones publicadas.</p>;
  }

  return (
    <div className="space-y-3">
      {rooms.map((h) => {
        const meta = ESTADO_META[h.estado];
        const libre = h.estado === 'LIBRE';
        return (
          <div
            key={h.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-bold text-foreground">{h.nombre}</p>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                  {meta.label}
                </span>
              </div>
              {h.descripcion && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{h.descripcion}</p>
              )}
              <p className="mt-1 text-sm font-black text-primary">
                S/ {h.precio.toLocaleString('es-PE')}
                <span className="text-[11px] font-medium text-muted-foreground"> /mes</span>
              </p>
              {h.estado === 'OCUPADA' && h.ocupante && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 p-2 max-w-xs sm:max-w-sm">
                  <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[9px] font-black text-primary">
                    {h.ocupante.nombre?.[0]?.toUpperCase() ?? 'R'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-foreground">
                      Roommate: {h.ocupante.nombre} {h.ocupante.apellido?.split(' ')[0] ?? ''}
                    </p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      {h.ocupante.carrera} {h.ocupante.nivelReputacion ? `· Reputación ${h.ocupante.nivelReputacion}` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {libre ? (
              <ReservationFormDialog
                propiedad={propiedad}
                habitacion={h}
                trigger={<Button size="sm" className="shrink-0">Reservar</Button>}
              />
            ) : (
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">No disponible</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
