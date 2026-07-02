'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, ChevronDown, Loader2, MapPin, Sparkles, Star } from 'lucide-react';
import { pagoService } from '@/services/pago-service';

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
import { notify } from '@/lib/notify';
import { metaEstadoReserva } from '@/lib/reservation-status';
import { formatearFecha } from '@/lib/relative-time';
import type { Reserva } from '@/types/reserva';
import { catalogosService, type ItemCatalogo } from '@/services/catalogos-service';

import { ReservationTimeline } from './reservation-timeline';
import { ReviewFormDialog } from './review-form-dialog';
import { PaymentFlowDialog } from './payment-flow-dialog';
import { StayPanelDialog } from './stay-panel-dialog';

interface Props {
  reserva: Reserva;
  onCancelar?: (id: string, motivo?: string) => Promise<boolean>;
}

const cancelable: Reserva['estado'][] = ['SOLICITADA', 'APROBADA'];

export function ReservationCard({ reserva, onCancelar }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [motivosCancelacion, setMotivosCancelacion] = useState<ItemCatalogo[]>([]);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [cargandoMotivos, setCargandoMotivos] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleOpenCancelDialog = async (open: boolean) => {
    setCancelDialogOpen(open);
    if (open) {
      setMotivoSeleccionado('');
      setMotivoOtro('');
      if (motivosCancelacion.length === 0) {
        setCargandoMotivos(true);
        try {
          const res = await catalogosService.obtenerPorTipo('MOTIVO_CANCELACION');
          setMotivosCancelacion(res);
        } catch (e) {
          console.error('Error cargando motivos de cancelación:', e);
        } finally {
          setCargandoMotivos(false);
        }
      }
    }
  };

  const showCustomTextArea = motivoSeleccionado === 'OTRO' || motivosCancelacion.length === 0;
  const cancelReasonInvalid = showCustomTextArea
    ? motivoOtro.trim().length < 4
    : !motivoSeleccionado;

  const handleConfirmCancel = async () => {
    if (cancelReasonInvalid) return;
    const finalReason = showCustomTextArea ? motivoOtro.trim() : motivoSeleccionado;
    const ok = await onCancelar?.(reserva.id, finalReason);
    if (ok) {
      setCancelDialogOpen(false);
    }
  };
  const [pagando, setPagando] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [stayOpen, setStayOpen] = useState(false);
  const meta = metaEstadoReserva(reserva.estado);
  const Icono = meta.icon;
  const puedeCancelar = cancelable.includes(reserva.estado);

  const handlePagar = async () => {
    setPagando(true);
    try {
      const { url } = await pagoService.crearPreferencia(reserva.id);
      if (!url) throw new Error('Sin URL de checkout');
      setCheckoutUrl(url);
      // Abrimos Mercado Pago en otra pestaña y dejamos esta esperando el pago.
      // OJO: no usar 'noopener' aquí — hace que window.open devuelva null SIEMPRE, y no
      // podríamos distinguir "abrió" de "popup bloqueado".
      const win = window.open(url, '_blank');
      if (!win) {
        // Popup bloqueado por el navegador → fallback a redirección en la misma pestaña.
        window.location.href = url;
        return;
      }
      setPayOpen(true);
    } catch (err) {
      notify.error(err, 'No pudimos iniciar el pago. Inténtalo de nuevo.');
    } finally {
      setPagando(false);
    }
  };

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

          {reserva.estado === 'RECHAZADA' && reserva.motivoRechazo && (
            <div className="mt-1.5 rounded-xl bg-red-50 p-2.5 text-xs text-red-800 dark:bg-red-950/20 dark:text-red-300">
              <strong className="font-bold">Motivo de rechazo:</strong> {reserva.motivoRechazo}
            </div>
          )}

          {reserva.estado === 'CANCELADA' && reserva.motivoCancelacion && (
            <div className="mt-1.5 rounded-xl bg-muted p-2.5 text-xs text-muted-foreground border border-border">
              <strong className="font-semibold">Motivo de cancelación:</strong> {reserva.motivoCancelacion}
            </div>
          )}

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
              <AlertDialog open={cancelDialogOpen} onOpenChange={handleOpenCancelDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold text-muted-foreground hover:text-destructive"
                  >
                    Cancelar reserva
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vas a cancelar la solicitud para <strong>{reserva.propiedadTitulo}</strong>.
                      Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="my-4 space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                      Motivo de cancelación
                    </label>
                    {cargandoMotivos ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 animate-pulse">
                        <Loader2 className="size-3.5 animate-spin" /> Cargando motivos del catálogo...
                      </div>
                    ) : (
                      motivosCancelacion.length > 0 && (
                        <select
                          value={motivoSeleccionado}
                          onChange={(e) => setMotivoSeleccionado(e.target.value)}
                          className="h-10 w-full rounded-xl border border-input bg-input px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="">Selecciona un motivo...</option>
                          {motivosCancelacion.map((m) => (
                            <option key={m.id} value={m.nombre}>
                              {m.nombre}
                            </option>
                          ))}
                          <option value="OTRO">Otro motivo...</option>
                        </select>
                      )
                    )}

                    {showCustomTextArea && (
                      <div className="space-y-1.5">
                        <textarea
                          rows={3}
                          value={motivoOtro}
                          onChange={(e) => setMotivoOtro(e.target.value)}
                          placeholder="Explica brevemente el motivo..."
                          maxLength={300}
                          className="w-full rounded-xl bg-muted border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground opacity-60">
                          <span>Mínimo 4 caracteres.</span>
                          <span>{motivoOtro.length}/300</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Mantener reserva</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={cancelReasonInvalid}
                      onClick={(e) => {
                        e.preventDefault();
                        handleConfirmCancel();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
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
                onClick={handlePagar}
                disabled={pagando}
              >
                {pagando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CalendarDays className="size-4" />
                )}
                {pagando ? 'Abriendo...' : 'Pagar ahora'}
              </Button>
            )}

            {reserva.estado === 'PAGADA' && (
              <Button
                size="sm"
                className="ml-auto h-8 gap-1.5 text-xs font-bold"
                onClick={() => setStayOpen(true)}
              >
                <Sparkles className="size-4" />
                Próximos pasos
              </Button>
            )}

            {reserva.estado === 'FINALIZADA' && (
              <ReviewFormDialog
                reserva={reserva}
                trigger={
                  <Button size="sm" className="ml-auto h-8 gap-1.5 text-xs font-bold">
                    <Star className="size-4" />
                    Dejar reseña
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-border bg-muted/30 p-5">
          <ReservationTimeline estado={reserva.estado} motivoRechazo={reserva.motivoRechazo} />
        </div>
      )}

      <PaymentFlowDialog
        open={payOpen}
        reservaId={reserva.id}
        monto={reserva.montoTotal}
        propiedadTitulo={reserva.propiedadTitulo}
        checkoutUrl={checkoutUrl}
        onClose={() => setPayOpen(false)}
      />

      <StayPanelDialog open={stayOpen} reserva={reserva} onClose={() => setStayOpen(false)} />
    </article>
  );
}
