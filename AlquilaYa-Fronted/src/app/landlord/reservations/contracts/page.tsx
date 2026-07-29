'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/legacy-card';
import { Button } from '@/components/ui/legacy-button';
import { Badge } from '@/components/ui/legacy-badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ReservationStatusBadge } from '@/components/shared/reservation-status-badge';
import { ContractActions } from '@/components/student/contract-actions';
import { useReservationsStore } from '@/stores/reservations-store';
import type { EstadoReserva, Reserva } from '@/types/reserva';

/** Solo las reservas que ya llegaron al pago tienen contrato generado (G4). */
const ESTADOS_CONTRATO: EstadoReserva[] = ['PAGADA', 'FINALIZADA'];

type EstadoFirmaContrato = 'ambas' | 'esperandoEstudiante' | 'pendienteDeTi';

const META_FIRMA: Record<EstadoFirmaContrato, { label: string; variant: 'success' | 'warning' | 'outline' }> = {
  ambas: { label: 'Firmado', variant: 'success' },
  esperandoEstudiante: { label: 'Esperando estudiante', variant: 'warning' },
  pendienteDeTi: { label: 'Pendiente de tu firma', variant: 'outline' },
};

/**
 * Estado real de firma (ítem 317), leído de `firmaEstudianteAt`/`firmaArrendadorAt`
 * (ya vienen en el DTO). Espejo de `contract-actions.tsx` (`yoFirme`/`arrendadorFirmo`/
 * `ambasFirmas`) pero desde la perspectiva del arrendador: aquí "yo" = arrendador.
 */
function estadoFirmaContrato(reserva: Reserva): EstadoFirmaContrato {
  const yoFirme = Boolean(reserva.firmaArrendadorAt);
  const estudianteFirmo = Boolean(reserva.firmaEstudianteAt);
  if (yoFirme && estudianteFirmo) return 'ambas';
  if (yoFirme && !estudianteFirmo) return 'esperandoEstudiante';
  return 'pendienteDeTi';
}

function formatearFecha(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatearMonto(monto: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(monto);
}

export default function LandlordContractsPage() {
  const { reservas, loading, error, cargar } = useReservationsStore();
  const [detalleId, setDetalleId] = useState<string | null>(null);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filas: Reserva[] = useMemo(() => {
    return reservas
      .filter((r) => ESTADOS_CONTRATO.includes(r.estado))
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }, [reservas]);

  // La reserva del detalle se busca en vivo en `reservas` (no en una copia local) para
  // que, tras firmar, el panel refleje de inmediato el `firmaArrendadorAt` actualizado.
  const detalle = useMemo(
    () => (detalleId ? (reservas.find((r) => r.id === detalleId) ?? null) : null),
    [reservas, detalleId],
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter opacity-90">
            Mis Contratos
          </h1>
          <p className="text-muted-foreground text-[12px] font-medium mt-0.5 tracking-tight">
            Gestión de documentos legales y acuerdos de alquiler.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cargar()}
          isLoading={loading}
          leftIcon={<span className="material-symbols-outlined text-[16px]">refresh</span>}
        >
          Actualizar
        </Button>
      </header>

      {error && !loading && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      <Card variant="glass" padding="none" className="overflow-hidden border border-border">
        {/* Loading state */}
        {loading && (
          <div className="p-8 space-y-3">
            <div className="h-6 w-1/3 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-1/2 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-1/4 bg-muted rounded-full animate-pulse" />
          </div>
        )}

        {!loading && filas.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-3xl">description</span>
            </div>
            <h2 className="text-xl font-black text-foreground tracking-tight">
              Aún no hay contratos
            </h2>
            <p className="text-muted-foreground text-sm font-medium mt-1 max-w-sm">
              Cuando una reserva se pague o finalice, su contrato aparecerá aquí.
            </p>
          </div>
        )}

        {!loading && filas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                    Estudiante
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                    Cuarto
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                    Periodo
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                    Firma
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-60 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filas.map((reserva) => {
                  const estadoFirma = estadoFirmaContrato(reserva);
                  const meta = META_FIRMA[estadoFirma];
                  return (
                    <tr key={reserva.id} className="hover:bg-muted transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-foreground/90">
                          {reserva.estudianteNombre ?? `Estudiante ${reserva.estudianteId}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          Reserva #{reserva.id}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-muted-foreground">
                          {reserva.propiedadTitulo ?? `Propiedad ${reserva.propiedadId}`}
                        </p>
                        {reserva.propiedadUbicacion && (
                          <p className="text-[10px] text-muted-foreground/70 font-medium">
                            {reserva.propiedadUbicacion}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-medium text-muted-foreground opacity-80">
                          {formatearFecha(reserva.fechaInicio)} – {formatearFecha(reserva.fechaFin)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={meta.variant} className="text-[10px] font-black uppercase">
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetalleId(reserva.id)}
                          className="text-primary font-black text-[10px] uppercase tracking-wider"
                        >
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 max-w-2xl">
        <h4 className="font-black text-primary text-[10px] mb-2 flex items-center gap-2 uppercase tracking-widest">
          <span className="material-symbols-outlined text-[16px]">info</span> Nota legal
        </h4>
        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
          Todos los contratos están encriptados y cumplen con la normativa de alquileres en
          Perú. Puedes descargar copias físicas en cualquier momento.
        </p>
      </div>

      <Sheet open={!!detalle} onOpenChange={(open) => { if (!open) setDetalleId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto space-y-6">
          {detalle && (
            <>
              <SheetHeader>
                <SheetTitle>Reserva #{detalle.id}</SheetTitle>
                <SheetDescription>
                  {detalle.propiedadTitulo ?? `Propiedad ${detalle.propiedadId}`}
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">
                    Estudiante
                  </p>
                  <p className="font-bold text-foreground">
                    {detalle.estudianteNombre ?? `Estudiante ${detalle.estudianteId}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">
                    Estado de la reserva
                  </p>
                  <ReservationStatusBadge estado={detalle.estado} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">
                    Periodo
                  </p>
                  <p className="font-bold text-foreground">
                    {formatearFecha(detalle.fechaInicio)} – {formatearFecha(detalle.fechaFin)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">
                    Monto
                  </p>
                  <p className="font-black text-primary">{formatearMonto(detalle.montoTotal)}</p>
                </div>
              </div>

              <ContractActions
                reserva={detalle}
                onFirmado={(actualizada) => {
                  // El store no expone una acción genérica de parche; usamos el
                  // `setState` estático de zustand para reflejar la firma sin
                  // tener que refetchear ni tocar `reservations-store.ts`.
                  useReservationsStore.setState((state) => ({
                    reservas: state.reservas.map((r) => (r.id === actualizada.id ? actualizada : r)),
                  }));
                }}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
