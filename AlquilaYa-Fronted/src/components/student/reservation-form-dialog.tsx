'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { differenceInCalendarMonths, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { CalendarDays, CreditCard, Info, ShieldCheck, Users, Wallet } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { reservationService } from '@/services/reservation-service';
import { servicioPropiedades } from '@/services/property-service';
import { notify } from '@/lib/notify';
import { formatPEN } from '@/lib/money';
import { POLITICA_CANCELACION_INFO } from '@/lib/politica-cancelacion';
import { reservaSchema } from '@/lib/reserva-schema';
import type { Habitacion, Propiedad } from '@/types/propiedad';

function parseFechaLocal(fecha: string): Date {
  return new Date(`${fecha}T00:00:00`);
}

interface Props {
  propiedad: Propiedad;
  trigger: ReactNode;
  /** Si la propiedad se gestiona por habitaciones, la habitación elegida (precio + id). */
  habitacion?: Habitacion;
}

const OCUPANTES_OPCIONES = [1, 2, 3, 4, 5];

export function ReservationFormDialog({ propiedad, trigger, habitacion }: Props) {
  const router = useRouter();
  const { estaAutenticado, usuario } = useAuth();
  const { open: abrirAuth } = useAuthModal();

  const { verificado, cargando: cargandoVerif, aplicable } = useVerificationStatus();

  const [open, setOpen] = useState(false);
  const [requiereVerificacion, setRequiereVerificacion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [rango, setRango] = useState<DateRange | undefined>();
  const [ocupantes, setOcupantes] = useState<number>(1);
  const [visitaPrevia, setVisitaPrevia] = useState(false);
  const [nota, setNota] = useState('');
  const [rangosOcupados, setRangosOcupados] = useState<DateRange[]>([]);

  useEffect(() => {
    if (!open) {
      setRequiereVerificacion(false);
      setRango(undefined);
      setOcupantes(1);
      setVisitaPrevia(false);
      setNota('');
      setRangosOcupados([]);
    }
  }, [open]);

  // Ítem 284: rangos ya ocupados de la propiedad, para deshabilitarlos en el calendario
  // (mismo endpoint que consume `AvailabilityPanel` en modo solo-lectura).
  useEffect(() => {
    if (!open) return;
    servicioPropiedades
      .obtenerCalendario(propiedad.id)
      .then((rangos) => {
        setRangosOcupados(
          rangos.map((r) => ({ from: parseFechaLocal(r.desde), to: parseFechaLocal(r.hasta) })),
        );
      })
      .catch(() => setRangosOcupados([]));
  }, [open, propiedad.id]);

  const fechaInicio = rango?.from;
  const fechaFin = rango?.to;

  // Precio por temporada: si el CHECK-IN cae en una temporada, su precio manda (solo unidad
  // completa; en modo habitación manda el precio del cuarto). Refleja el cálculo del backend.
  const temporadaAplicable =
    !habitacion && fechaInicio && propiedad.temporadas?.length
      ? propiedad.temporadas.find((t) => {
          const f = format(fechaInicio, 'yyyy-MM-dd');
          return t.fechaInicio <= f && f <= t.fechaFin;
        })
      : undefined;
  const precioUnitario = temporadaAplicable?.precio ?? habitacion?.precio ?? propiedad.precio;

  const meses =
    fechaInicio && fechaFin ? Math.max(1, differenceInCalendarMonths(fechaFin, fechaInicio)) : 1;
  const total = precioUnitario * meses;

  const handleTrigger = (e: React.MouseEvent) => {
    if (!estaAutenticado) {
      e.preventDefault();
      e.stopPropagation();
      abrirAuth('login');
      return;
    }
    if (usuario?.rol !== 'ESTUDIANTE') {
      e.preventDefault();
      notify.warning('Solo los estudiantes pueden reservar');
      return;
    }
    if (aplicable && !cargandoVerif && !verificado) {
      setRequiereVerificacion(true);
    }
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = reservaSchema.safeParse({ fechaInicio, fechaFin });
    if (!parsed.success) {
      notify.warning(parsed.error.issues[0]?.message ?? 'Revisa las fechas seleccionadas');
      return;
    }
    setEnviando(true);
    try {
      await reservationService.crear({
        propiedadId: propiedad.id,
        fechaInicio: format(parsed.data.fechaInicio, 'yyyy-MM-dd'),
        fechaFin: format(parsed.data.fechaFin, 'yyyy-MM-dd'),
        habitacionId: habitacion?.id,
      });
      notify.success('Solicitud enviada', 'Te avisaremos cuando el arrendador responda.');
      setOpen(false);
      router.push('/student/reservations');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = String(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '',
      );
      if (status === 409 && /verificar|verificaci/i.test(msg)) {
        setRequiereVerificacion(true);
        return;
      }
      notify.error(err, 'No pudimos crear la reserva');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {/* Ítem 414: el trigger nunca queda `disabled` (siempre es clickeable: sin sesión abre el
          login, ver `handleTrigger`), pero sin este tooltip un usuario deslogueado no sabe POR
          QUÉ el clic lo manda a iniciar sesión en vez de reservar. Explica la razón en
          hover/foco antes de hacer clic. */}
      {estaAutenticado ? (
        <span onClick={handleTrigger}>{trigger}</span>
      ) : (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span onClick={handleTrigger}>{trigger}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-56 text-xs">
              Inicia sesión para reservar este cuarto.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span className="hidden" aria-hidden />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-h2">
              {requiereVerificacion ? 'Verifica tu identidad' : 'Reservar cuarto'}
            </DialogTitle>
            <DialogDescription>
              {requiereVerificacion
                ? 'Es un paso único para mantener segura la comunidad.'
                : `Solicita una visita o reserva directa para ${propiedad.titulo}.`}
            </DialogDescription>
          </DialogHeader>

          {requiereVerificacion ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="size-8 text-primary" />
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Para reservar necesitas verificar tu identidad: sube las dos caras de tu DNI y
                espera la aprobación (menos de 24h hábiles).
              </p>
              <Button asChild size="lg" className="h-12 rounded-full px-8 text-sm font-bold">
                <Link href="/student/profile?tab=verificacion">Ir a verificación</Link>
              </Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Ahora no
              </button>
            </div>
          ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Periodo de estadía</Label>
              <DateRangePicker
                value={rango}
                onChange={setRango}
                disabled={[{ before: startOfDay(new Date()) }, ...rangosOcupados]}
                placeholder="Selecciona entrada y salida"
              />
              {fechaInicio && fechaFin && (
                <p className="text-xs text-muted-foreground">
                  {meses} {meses === 1 ? 'mes' : 'meses'} · hasta el{' '}
                  <strong className="text-foreground">
                    {format(fechaFin, "d 'de' MMMM yyyy", { locale: es })}
                  </strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Ocupantes</Label>
                <Select
                  value={String(ocupantes)}
                  onValueChange={(v) => setOcupantes(Number(v))}
                >
                  <SelectTrigger className="h-11">
                    <Users className="mr-1 size-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OCUPANTES_OPCIONES.map((o) => (
                      <SelectItem key={o} value={String(o)}>
                        {o} {o === 1 ? 'persona' : 'personas'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Visita previa</Label>
                <div className="flex h-11 items-center justify-between rounded-md border border-input bg-card px-3">
                  <span className="text-xs text-muted-foreground">
                    {visitaPrevia ? 'Quiero visitar' : 'Reserva directa'}
                  </span>
                  <Switch checked={visitaPrevia} onCheckedChange={setVisitaPrevia} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nota" className="text-xs font-bold uppercase tracking-wider">
                Mensaje al arrendador (opcional)
              </Label>
              <Textarea
                id="nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="¡Hola! Soy estudiante UPeU, me interesa tu cuarto…"
                maxLength={500}
                rows={3}
              />
              <p className="text-right text-[10px] text-muted-foreground">{nota.length}/500</p>
            </div>

            <TooltipProvider delayDuration={200}>
              <div className="space-y-2.5 rounded-xl bg-muted p-4">
                {temporadaAplicable && (
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                    <CalendarDays className="size-3.5" aria-hidden />
                    Precio de temporada{temporadaAplicable.etiqueta ? ` · ${temporadaAplicable.etiqueta}` : ''} (según tu fecha de ingreso)
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    Renta{habitacion ? ` (${habitacion.nombre})` : ''} · {formatPEN(precioUnitario)} × {meses}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3.5 shrink-0 cursor-help" aria-label="¿Qué es la renta?" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56 text-xs">
                        Precio mensual de la propiedad{habitacion ? ' (o de la habitación elegida)' : ''} multiplicado por la duración de tu estadía.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="tnum font-bold text-foreground">{formatPEN(total)}</span>
                </div>

                {!!propiedad.deposito && propiedad.deposito > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      Depósito de garantía
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 shrink-0 cursor-help" aria-label="¿Qué es el depósito de garantía?" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-56 text-xs">
                          Monto reembolsable que exige el arrendador como garantía, aparte de la renta.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <span className="tnum font-bold text-foreground">{formatPEN(propiedad.deposito)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    Comisión de servicio
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3.5 shrink-0 cursor-help" aria-label="¿Qué es la comisión de servicio?" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56 text-xs">
                        Cargo de la plataforma según la zona de la propiedad. Se confirma junto con tu solicitud.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="text-xs italic text-muted-foreground">Se calculará según tu zona</span>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-2.5">
                  <span className="text-sm font-bold">Total estimado</span>
                  <span className="tnum text-xl font-black text-primary">
                    {formatPEN(total + (propiedad.deposito ?? 0))}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  No incluye la comisión de servicio, que verás desglosada al confirmar tu solicitud.
                </p>
              </div>
            </TooltipProvider>

            {propiedad.politicaCancelacion && (
              <div className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  <span className="font-bold text-foreground">
                    Cancelación{' '}
                    {POLITICA_CANCELACION_INFO[propiedad.politicaCancelacion].label.toLowerCase()}:
                  </span>{' '}
                  {POLITICA_CANCELACION_INFO[propiedad.politicaCancelacion].descripcion}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                <Wallet className="size-3.5" aria-hidden />
                Yape
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                <CreditCard className="size-3.5" aria-hidden />
                Visa / Mastercard
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                <Wallet className="size-3.5" aria-hidden />
                PagoEfectivo
              </span>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={enviando || !fechaInicio}
              className="h-12 w-full rounded-full text-sm font-bold"
            >
              {enviando ? 'Enviando…' : visitaPrevia ? 'Solicitar visita' : 'Solicitar reserva'}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Sin cargos hasta confirmar. La reserva se concreta al pagar el primer mes.
            </p>
          </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
