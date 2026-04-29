'use client';

import { useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/legacy-card';
import { Button } from '@/components/ui/legacy-button';
import { Badge } from '@/components/ui/legacy-badge';
import { useReservationsStore } from '@/stores/reservations-store';
import type { EstadoReserva, Reserva } from '@/types/reserva';

const ESTADOS_CONTRATO: EstadoReserva[] = ['PAGADA', 'FINALIZADA'];

interface FilaContrato {
  reserva: Reserva;
  /** Etiqueta visible del estado del contrato derivada del estado de la reserva. */
  estadoContrato: 'firmado' | 'expirado';
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

function derivarEstadoContrato(reserva: Reserva): FilaContrato['estadoContrato'] {
  return reserva.estado === 'FINALIZADA' ? 'expirado' : 'firmado';
}

export default function LandlordContractsPage() {
  const { reservas, loading, error, cargar } = useReservationsStore();

  useEffect(() => {
    // Cargamos todas y derivamos contratos client-side a partir de los
    // estados PAGADA y FINALIZADA. Cuando exista un endpoint dedicado a
    // contratos, sustituir por una llamada server-side directa.
    cargar();
  }, [cargar]);

  const filas: FilaContrato[] = useMemo(() => {
    return reservas
      .filter((r) => ESTADOS_CONTRATO.includes(r.estado))
      .map((reserva) => ({ reserva, estadoContrato: derivarEstadoContrato(reserva) }))
      .sort((a, b) => {
        const aMs = new Date(a.reserva.fechaCreacion).getTime();
        const bMs = new Date(b.reserva.fechaCreacion).getTime();
        return bMs - aMs;
      });
  }, [reservas]);

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
            Mis Contratos
          </h1>
          <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
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

      <Card variant="glass" padding="none" className="overflow-hidden border border-on-surface/5">
        {/* Loading state */}
        {loading && (
          <div className="p-8 space-y-3">
            <div className="h-6 w-1/3 bg-on-surface/5 rounded-full animate-pulse" />
            <div className="h-4 w-1/2 bg-on-surface/5 rounded-full animate-pulse" />
            <div className="h-4 w-1/4 bg-on-surface/5 rounded-full animate-pulse" />
          </div>
        )}

        {!loading && filas.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-3xl">description</span>
            </div>
            <h2 className="text-xl font-black text-on-surface tracking-tight">
              Aún no hay contratos
            </h2>
            <p className="text-on-surface-variant text-sm font-medium mt-1 max-w-sm">
              Cuando una reserva se pague o finalice, su contrato aparecerá aquí.
            </p>
          </div>
        )}

        {!loading && filas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-on-surface/5 border-b border-on-surface/10">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                    Estudiante
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                    Cuarto
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                    Periodo
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-on-surface/5">
                {filas.map(({ reserva, estadoContrato }) => (
                  <tr key={reserva.id} className="hover:bg-on-surface/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-on-surface/90">
                        {reserva.estudianteNombre ?? `Estudiante ${reserva.estudianteId}`}
                      </p>
                      <p className="text-[10px] text-on-surface-variant font-medium">
                        Reserva #{reserva.id}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-on-surface-variant">
                        {reserva.propiedadTitulo ?? `Propiedad ${reserva.propiedadId}`}
                      </p>
                      {reserva.propiedadUbicacion && (
                        <p className="text-[10px] text-on-surface-variant/70 font-medium">
                          {reserva.propiedadUbicacion}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] font-medium text-on-surface-variant opacity-80">
                        {formatearFecha(reserva.fechaInicio)} – {formatearFecha(reserva.fechaFin)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={estadoContrato === 'firmado' ? 'success' : 'outline'}
                        className="text-[10px] font-black uppercase"
                      >
                        {estadoContrato}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-500 font-black text-[10px] uppercase tracking-wider"
                      >
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="bg-blue-500/5 rounded-2xl p-6 border border-blue-500/10 max-w-2xl">
        <h4 className="font-black text-blue-500 text-[10px] mb-2 flex items-center gap-2 uppercase tracking-widest">
          <span className="material-symbols-outlined text-[16px]">info</span> Nota legal
        </h4>
        <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed">
          Todos los contratos están encriptados y cumplen con la normativa de alquileres en
          Perú. Puedes descargar copias físicas en cualquier momento.
        </p>
      </div>
    </div>
  );
}
