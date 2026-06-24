'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Check,
  Copy,
  Loader2,
  MapPin,
  MessageCircle,
  PartyPopper,
  Printer,
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
  const [fechaPago, setFechaPago] = useState<string | null>(null);
  // Monto REAL cobrado (incluye comisión); reserva.montoTotal es solo la parte del arrendador.
  const [montoPagado, setMontoPagado] = useState<number | null>(null);
  const [contactando, setContactando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!open) return;
    let activo = true;
    pagoService
      .getEstadoPago(reserva.id)
      .then((r) => {
        if (!activo) return;
        setPaymentId(r.paymentId);
        setFechaPago(r.fechaPago);
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

  const imprimirComprobante = () => {
    const fecha = fechaPago ? new Date(fechaPago).toLocaleString('es-PE') : '—';
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
      <title>Comprobante de pago — AlquilaYa</title>
      <style>
        body{font-family:system-ui,Arial,sans-serif;color:#1a1a1a;max-width:520px;margin:40px auto;padding:0 24px}
        h1{color:#7a1f2b;font-size:20px;margin:0 0 4px}
        .muted{color:#666;font-size:12px}
        .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;font-size:14px}
        .row b{font-weight:700}
        .total{font-size:22px;font-weight:800;margin-top:8px}
        .ok{display:inline-block;margin-top:16px;padding:6px 12px;border-radius:999px;background:#e7f7ec;color:#1a7f37;font-size:12px;font-weight:700}
      </style></head><body>
      <h1>AlquilaYa · Comprobante de pago</h1>
      <p class="muted">Pago realizado a través de Mercado Pago</p>
      <span class="ok">✓ PAGADO</span>
      <div style="margin-top:20px">
        <div class="row"><span>Reserva</span><b>${reserva.propiedadTitulo ?? `#${reserva.id}`}</b></div>
        <div class="row"><span>Dirección</span><b>${reserva.propiedadUbicacion ?? '—'}</b></div>
        <div class="row"><span>Periodo</span><b>${formatearFecha(reserva.fechaInicio)} — ${formatearFecha(reserva.fechaFin)}</b></div>
        <div class="row"><span>Código de pago</span><b>${paymentId ?? '—'}</b></div>
        <div class="row"><span>Fecha de pago</span><b>${fecha}</b></div>
        <div class="row"><span>Monto pagado</span><b class="total">S/ ${(montoPagado ?? reserva.montoTotal).toLocaleString('es-PE')}</b></div>
      </div>
      <p class="muted" style="margin-top:24px">Gracias por usar AlquilaYa. Conserva este comprobante como respaldo de tu pago.</p>
      </body></html>`;
    const win = window.open('', '_blank', 'width=600,height=820');
    if (!win) {
      notify.error(null, 'Permite las ventanas emergentes para imprimir el comprobante.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
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
                        ? 'bg-green-500 text-white'
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
              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-600">
                PAGADO
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Monto
                </p>
                <p className="text-lg font-black text-foreground">
                  S/ {(montoPagado ?? reserva.montoTotal).toLocaleString('es-PE')}
                </p>
              </div>
              {paymentId && (
                <button
                  onClick={copiar}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition',
                    copiado
                      ? 'bg-green-500/15 text-green-600'
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
              onClick={imprimirComprobante}
            >
              <Printer className="size-4" /> Descargar / imprimir comprobante
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
