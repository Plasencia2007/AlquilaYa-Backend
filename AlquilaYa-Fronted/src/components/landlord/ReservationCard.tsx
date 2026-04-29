'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import type { EstadoReserva, Reserva } from '@/types/reserva';
import { cn } from '@/lib/cn';

interface ReservationCardProps {
  reserva: Reserva;
  onAprobar?: (reserva: Reserva) => void;
  onRechazar?: (reserva: Reserva) => void;
  onFinalizar?: (reserva: Reserva) => void;
  /** Modo compacto sólo lectura (historial). */
  readOnly?: boolean;
}

const ESTADO_VARIANTE: Record<EstadoReserva, 'success' | 'warning' | 'error' | 'primary' | 'surface' | 'outline'> = {
  SOLICITADA: 'warning',
  APROBADA: 'primary',
  PAGADA: 'success',
  FINALIZADA: 'surface',
  RECHAZADA: 'error',
  CANCELADA: 'outline',
};

const ESTADO_LABEL: Record<EstadoReserva, string> = {
  SOLICITADA: 'Pendiente',
  APROBADA: 'Aprobada',
  PAGADA: 'Pagada',
  FINALIZADA: 'Finalizada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

function formatearFecha(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatearMonto(monto: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(monto);
}

function obtenerInicialesEstudiante(nombre?: string): string {
  if (!nombre) return 'ES';
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

export function ReservationCard({
  reserva,
  onAprobar,
  onRechazar,
  onFinalizar,
  readOnly = false,
}: ReservationCardProps) {
  const variante = ESTADO_VARIANTE[reserva.estado];
  const label = ESTADO_LABEL[reserva.estado];

  const puedeAprobarRechazar = reserva.estado === 'SOLICITADA';
  const puedeFinalizar =
    reserva.estado === 'APROBADA' || reserva.estado === 'PAGADA';

  return (
    <Card
      variant="lowest"
      padding="none"
      hoverable={false}
      className="border border-on-surface/5 overflow-hidden"
    >
      <div className="flex flex-col md:flex-row gap-0">
        {/* Imagen / Avatar de la propiedad */}
        <div className="relative w-full md:w-44 h-32 md:h-40 shrink-0 bg-on-surface/5">
          {reserva.propiedadImagen ? (
            <Image
              src={reserva.propiedadImagen}
              alt={reserva.propiedadTitulo ?? 'Propiedad'}
              fill
              sizes="(max-width: 768px) 100vw, 176px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
              <span className="material-symbols-outlined text-4xl">apartment</span>
            </div>
          )}
        </div>

        {/* Cuerpo */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-widest uppercase text-on-surface-variant opacity-60">
                Reserva #{reserva.id}
              </p>
              <h3 className="text-base font-black text-on-surface tracking-tight truncate mt-0.5">
                {reserva.propiedadTitulo ?? `Propiedad ${reserva.propiedadId}`}
              </h3>
              {reserva.propiedadUbicacion && (
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5 truncate">
                  <span className="material-symbols-outlined text-[12px] align-middle mr-1">
                    location_on
                  </span>
                  {reserva.propiedadUbicacion}
                </p>
              )}
            </div>
            <Badge variant={variante} className="shrink-0">{label}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">
                Estudiante
              </p>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-black shrink-0">
                  {obtenerInicialesEstudiante(reserva.estudianteNombre)}
                </div>
                <p className="font-bold text-on-surface truncate">
                  {reserva.estudianteNombre ?? `Estudiante ${reserva.estudianteId}`}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">
                Inicio
              </p>
              <p className="font-bold text-on-surface">{formatearFecha(reserva.fechaInicio)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">
                Fin
              </p>
              <p className="font-bold text-on-surface">{formatearFecha(reserva.fechaFin)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant opacity-50 mb-1">
                Monto
              </p>
              <p className="font-black text-blue-500">{formatearMonto(reserva.montoTotal)}</p>
            </div>
          </div>

          {reserva.motivoRechazo && reserva.estado === 'RECHAZADA' && (
            <div className="text-[11px] bg-red-500/5 border border-red-500/10 text-red-600 rounded-2xl px-3 py-2">
              <span className="font-black uppercase text-[9px] tracking-widest">Motivo: </span>
              <span className="font-medium">{reserva.motivoRechazo}</span>
            </div>
          )}

          {!readOnly && (puedeAprobarRechazar || puedeFinalizar) && (
            <div className={cn('flex flex-wrap gap-2 pt-1')}>
              {puedeAprobarRechazar && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onAprobar?.(reserva)}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onRechazar?.(reserva)}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    Rechazar
                  </Button>
                </>
              )}
              {puedeFinalizar && (
                <Button
                  size="sm"
                  variant="dark"
                  onClick={() => onFinalizar?.(reserva)}
                >
                  <span className="material-symbols-outlined text-[14px]">flag</span>
                  Finalizar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default ReservationCard;
