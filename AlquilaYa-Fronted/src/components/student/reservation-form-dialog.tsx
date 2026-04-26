'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { CalendarDays, Users } from 'lucide-react';

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
import { reservationService } from '@/services/reservation-service';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/cn';
import type { Propiedad } from '@/types/propiedad';

interface Props {
  propiedad: Propiedad;
  trigger: ReactNode;
}

const MESES_PRESET = [1, 3, 6, 12];
const OCUPANTES_OPCIONES = [1, 2, 3, 4, 5];

export function ReservationFormDialog({ propiedad, trigger }: Props) {
  const router = useRouter();
  const { estaAutenticado, usuario } = useAuth();
  const { open: abrirAuth } = useAuthModal();

  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
  const [meses, setMeses] = useState<number>(1);
  const [ocupantes, setOcupantes] = useState<number>(1);
  const [visitaPrevia, setVisitaPrevia] = useState(false);
  const [nota, setNota] = useState('');

  useEffect(() => {
    if (!open) {
      setFechaInicio(undefined);
      setMeses(1);
      setOcupantes(1);
      setVisitaPrevia(false);
      setNota('');
    }
  }, [open]);

  const fechaFin = fechaInicio ? addMonths(fechaInicio, meses) : undefined;
  const total = propiedad.precio * meses;

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
      });
      notify.success('Solicitud enviada', 'Te avisaremos cuando el arrendador responda.');
      setOpen(false);
      router.push('/student/reservations');
    } catch (err) {
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
            <DialogTitle className="font-headline text-xl font-bold">Reservar cuarto</DialogTitle>
            <DialogDescription>
              Solicita una visita o reserva directa para {propiedad.titulo}.
            </DialogDescription>
          </DialogHeader>

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
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  S/ {propiedad.precio.toLocaleString('es-PE')} × {meses}
                </span>
                <span className="font-bold text-foreground">
                  S/ {total.toLocaleString('es-PE')}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="text-sm font-bold">Total</span>
                <span className="text-xl font-black text-primary">
                  S/ {total.toLocaleString('es-PE')}
                </span>
              </div>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
