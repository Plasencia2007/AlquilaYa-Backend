'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, ChevronDown, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/cn';
import { metaEstadoReserva } from '@/lib/reservation-status';
import { formatearFecha } from '@/lib/relative-time';
import type { Reserva } from '@/types/reserva';

import { ReservationTimeline } from './reservation-timeline';

interface Props {
  reserva: Reserva;
  onCancelar?: (id: string) => Promise<boolean>;
}

const cancelable: Reserva['estado'][] = ['SOLICITADA', 'APROBADA'];

export function ReservationCard({ reserva, onCancelar }: Props) {
  const [expandido, setExpandido] = useState(false);
  const meta = metaEstadoReserva(reserva.estado);
  const Icono = meta.icon;
  const puedeCancelar = cancelable.includes(reserva.estado);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <Link
          href={`/property/${reserva.propiedadId}`}
          className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-40"
          aria-label="Ver propiedad"
        >
          {reserva.propiedadImagen ? (
            <Image
              fill
              sizes="160px"
              src={reserva.propiedadImagen}
              alt={reserva.propiedadTitulo ?? 'Propiedad'}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Sin imagen
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/property/${reserva.propiedadId}`}
                className="block truncate text-base font-bold text-foreground hover:text-primary"
              >
                {reserva.propiedadTitulo ?? `Reserva #${reserva.id}`}
              </Link>
              {reserva.propiedadUbicacion && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {reserva.propiedadUbicacion}
                </p>
              )}
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider',
                meta.bg,
                meta.text,
                meta.border,
              )}
            >
              <Icono className="size-3.5" /> {meta.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:flex sm:gap-6">
            <div>
              <p className="font-semibold uppercase tracking-wider text-[10px]">Entrada</p>
              <p className="text-foreground">{formatearFecha(reserva.fechaInicio)}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wider text-[10px]">Salida</p>
              <p className="text-foreground">{formatearFecha(reserva.fechaFin)}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="font-semibold uppercase tracking-wider text-[10px]">Total</p>
              <p className="font-black text-primary">
                S/ {reserva.montoTotal.toLocaleString('es-PE')}
              </p>
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpandido((v) => !v)}
              className="h-8 gap-1.5 text-xs font-bold"
              aria-expanded={expandido}
            >
              <ChevronDown
                className={cn('size-4 transition-transform', expandido && 'rotate-180')}
              />
              {expandido ? 'Ocultar' : 'Ver progreso'}
            </Button>

            {puedeCancelar && onCancelar && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold text-muted-foreground hover:text-destructive"
                  >
                    Cancelar reserva
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vas a cancelar la solicitud para <strong>{reserva.propiedadTitulo}</strong>.
                      Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Mantener reserva</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onCancelar(reserva.id)}>
                      Sí, cancelar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {reserva.estado === 'APROBADA' && (
              <Button
                size="sm"
                className="ml-auto h-8 gap-1.5 text-xs font-bold"
              >
                <CalendarDays className="size-4" /> Pagar ahora
              </Button>
            )}
          </div>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-border bg-muted/30 p-5">
          <ReservationTimeline estado={reserva.estado} motivoRechazo={reserva.motivoRechazo} />
        </div>
      )}
    </article>
  );
}
