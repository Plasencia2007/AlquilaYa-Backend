'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Check,
  Copy,
  Download,
  Loader2,
  MapPin,
  MessageCircle,
  PartyPopper,
  Users,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { conversationService } from '@/services/conversation-service';
import { registrarContacto } from '@/services/property-service';
import { pagoService } from '@/services/pago-service';
import { formatearFecha } from '@/lib/relative-time';
import { formatPEN } from '@/lib/money';
import type { Reserva } from '@/types/reserva';

interface Props {
  open: boolean;
  reserva: Reserva;
  onClose: () => void;
}

function diasHasta(fechaIso: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(fechaIso);
  objetivo.setHours(0, 0, 0, 0);
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000);
}

export function StayPanelDialog({ open, reserva, onClose }: Props) {
  const router = useRouter();
  const [paymentId, setPaymentId] = useState<string | null>(null);
  // Monto REAL cobrado (incluye comisión); reserva.montoTotal es solo la parte del arrendador.
  const [montoPagado, setMontoPagado] = useState<number | null>(null);
  const [contactando, setContactando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (!open) return;
    let activo = true;
    pagoService
      .getEstadoPago(reserva.id)
      .then((r) => {
        if (!activo) return;
        setPaymentId(r.paymentId);
        setMontoPagado(r.monto);
      })
      .catch(() => {
        /* el comprobante es complementario; si falla, el panel igual sirve */
      });
    return () => {
      activo = false;
    };
  }, [open, reserva.id]);

  if (!open) return null;

  const dias = diasHasta(reserva.fechaInicio);
  const cuentaRegresiva =
    dias > 1 ? `Faltan ${dias} días` : dias === 1 ? 'Es mañana' : dias === 0 ? '¡Es hoy!' : 'En curso';

  const coordinar = async () => {
    if (!reserva.arrendadorId) {
      notify.error(null, 'No encontramos al arrendador de esta reserva.');
      return;
    }
    setContactando(true);
    try {
      const conv = await conversationService.crearOObtener(
        Number(reserva.arrendadorId),
        Number(reserva.propiedadId),
      );
      void registrarContacto(reserva.propiedadId);
      router.push(`/student/messages/${conv.id}`);
    } catch (err) {
      notify.error(err, 'No pudimos abrir el chat con el arrendador.');
      setContactando(false);
    }
  };

  const copiar = async () => {
    if (!paymentId) return;
    try {
      await navigator.clipboard.writeText(paymentId);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      notify.error(null, 'No se pudo copiar el código.');
    }
  };

  const descargarComprobante = async () => {
    setDescargando(true);
    try {
      const blob = await pagoService.descargarComprobante(reserva.id);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) notify.warning('Habilita las ventanas emergentes para ver el comprobante.');
      // Revocamos con margen: la pestaña nueva necesita tiempo para terminar de cargar el blob.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      notify.error(err, 'No se pudo descargar el comprobante.');
    } finally {
      setDescargando(false);
    }
  };

  const pasos = [
    { titulo: 'Pago realizado', descripcion: 'Tu primer mes está pagado.', hecho: true },
    {
      titulo: 'Coordina con el arrendador',
      descripcion: 'Ponte de acuerdo por el chat para la entrega.',
      hecho: false,
    },
    {
      titulo: 'Acuerda la entrega de llaves',
      descripcion: 'Define día, hora y lugar con el arrendador.',
      hecho: false,
    },
    {
      titulo: `Múdate el ${formatearFecha(reserva.fechaInicio)}`,
      descripcion: cuentaRegresiva,
      hecho: false,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>

        {/* Encabezado */}
        <div className="bg-gradient-to-br from-primary/15 to-primary/5 px-6 pb-5 pt-8 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/15">
            <PartyPopper className="size-7 text-primary" />
          </div>
          <h2 className="text-xl font-black text-foreground">¡Reserva confirmada!</h2>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {reserva.propiedadTitulo ?? `Reserva #${reserva.id}`}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            <CalendarDays className="size-3.5" /> {cuentaRegresiva} para mudarte
          </span>
        </div>

        <div className="space-y-5 p-6">
          {/* Checklist de próximos pasos */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-foreground">Próximos pasos</h3>
            <ol className="space-y-3">
              {pasos.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <div
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      p.hecho
                        ? 'bg-success text-success-foreground'
                        : 'border-2 border-primary/30 bg-primary/5 text-primary',
                    )}
                  >
                    {p.hecho ? <Check className="size-4" /> : i + 1}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        p.hecho ? 'text-muted-foreground line-through' : 'text-foreground',
                      )}
                    >
                      {p.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.descripcion}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Coordinar con el arrendador */}
          <Button onClick={coordinar} disabled={contactando} className="w-full gap-2 font-bold">
            {contactando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageCircle className="size-4" />
            )}
            {contactando
              ? 'Abriendo chat…'
              : `Coordinar con ${reserva.arrendadorNombre ?? 'el arrendador'}`}
          </Button>

          {/* Detalles de la estadía */}
          <section className="rounded-2xl border border-border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-bold text-foreground">Tu estadía</h3>
            <div className="space-y-2.5 text-sm">
              {reserva.propiedadUbicacion && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">{reserva.propiedadUbicacion}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">
                  {formatearFecha(reserva.fechaInicio)} — {formatearFecha(reserva.fechaFin)}
                  {reserva.meses ? ` · ${reserva.meses} ${reserva.meses === 1 ? 'mes' : 'meses'}` : ''}
                </span>
              </div>
              {reserva.ocupantes != null && (
                <div className="flex items-center gap-2">
                  <Users className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">
                    {reserva.ocupantes} {reserva.ocupantes === 1 ? 'ocupante' : 'ocupantes'}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Comprobante de pago */}
          <section className="rounded-2xl border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Comprobante de pago</h3>
              <span className="rounded-full bg-success-light px-2 py-0.5 text-[10px] font-bold text-success">
                PAGADO
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Monto
                </p>
                <p className="tnum text-lg font-black text-foreground">
                  {formatPEN(montoPagado ?? reserva.montoTotal)}
                </p>
              </div>
              {paymentId && (
                <button
                  onClick={copiar}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition',
                    copiado
                      ? 'bg-success-light text-success'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  title={paymentId}
                >
                  {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copiado ? 'Copiado' : `Código: ${paymentId.slice(-8)}`}
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full gap-1.5"
              onClick={descargarComprobante}
              disabled={descargando}
            >
              {descargando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Descargar comprobante
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
