'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { CalendarDays, ShieldCheck, Users } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from '@/stores/auth-modal-store';
import { useVerificationStatus } from '@/hooks/use-verification-status';
import { reservationService } from '@/services/reservation-service';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import { formatPEN } from '@/lib/money';
import { POLITICA_CANCELACION_INFO } from '@/lib/politica-cancelacion';
import type { Habitacion, Propiedad } from '@/types/propiedad';

interface Props {
  propiedad: Propiedad;
  trigger: ReactNode;
  /** Si la propiedad se gestiona por habitaciones, la habitación elegida (precio + id). */
  habitacion?: Habitacion;
}

const MESES_PRESET = [1, 3, 6, 12];
const OCUPANTES_OPCIONES = [1, 2, 3, 4, 5];

export function ReservationFormDialog({ propiedad, trigger, habitacion }: Props) {
  const router = useRouter();
  const { estaAutenticado, usuario } = useAuth();
  const { open: abrirAuth } = useAuthModal();

  const { verificado, cargando: cargandoVerif, aplicable } = useVerificationStatus();

  const [open, setOpen] = useState(false);
  const [requiereVerificacion, setRequiereVerificacion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
  const [meses, setMeses] = useState<number>(1);
  const [ocupantes, setOcupantes] = useState<number>(1);
  const [visitaPrevia, setVisitaPrevia] = useState(false);
  const [nota, setNota] = useState('');

  useEffect(() => {
    if (!open) {
      setRequiereVerificacion(false);
      setFechaInicio(undefined);
      setMeses(1);
      setOcupantes(1);
      setVisitaPrevia(false);
      setNota('');
    }
  }, [open]);

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

  const fechaFin = fechaInicio ? addMonths(fechaInicio, meses) : undefined;
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
    if (!fechaInicio || !fechaFin) {
      notify.warning('Elige una fecha de entrada');
      return;
    }
    setEnviando(true);
    try {
      await reservationService.crear({
        propiedadId: propiedad.id,
        fechaInicio: format(fechaInicio, 'yyyy-MM-dd'),
        fechaFin: format(fechaFin, 'yyyy-MM-dd'),
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
      <span onClick={handleTrigger}>{trigger}</span>

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
              <Label className="text-xs font-bold uppercase tracking-wider">Fecha de entrada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-11 w-full justify-start gap-2 text-left font-normal',
                      !fechaInicio && 'text-muted-foreground',
                    )}
                  >
                    <CalendarDays className="size-4" />
                    {fechaInicio
                      ? format(fechaInicio, "d 'de' MMMM yyyy", { locale: es })
                      : 'Selecciona una fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2">
                  <DayPicker
                    mode="single"
                    selected={fechaInicio}
                    onSelect={setFechaInicio}
                    locale={es}
                    disabled={{ before: new Date() }}
                    showOutsideDays
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Duración</Label>
              <div className="flex flex-wrap gap-2">
                {MESES_PRESET.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMeses(m)}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-sm font-bold transition-colors',
                      meses === m
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:border-primary',
                    )}
                  >
                    {m} {m === 1 ? 'mes' : 'meses'}
                  </button>
                ))}
              </div>
              {fechaFin && (
                <p className="text-xs text-muted-foreground">
                  Hasta el{' '}
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

            <div className="rounded-xl bg-muted p-4">
              {temporadaAplicable && (
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                  <CalendarDays className="size-3.5" aria-hidden />
                  Precio de temporada{temporadaAplicable.etiqueta ? ` · ${temporadaAplicable.etiqueta}` : ''} (según tu fecha de ingreso)
                </p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="tnum text-muted-foreground">
                  {habitacion ? `${habitacion.nombre}: ` : ''}{formatPEN(precioUnitario)} × {meses}
                </span>
                <span className="tnum font-bold text-foreground">
                  {formatPEN(total)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="text-sm font-bold">Total</span>
                <span className="tnum text-xl font-black text-primary">
                  {formatPEN(total)}
                </span>
              </div>
            </div>

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
