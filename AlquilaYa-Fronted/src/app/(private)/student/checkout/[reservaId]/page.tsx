'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle2, Clock, MapPin, ShieldCheck, Ticket, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Stepper, type StepperStep } from '@/components/ui/stepper';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CenteredSpinner } from '@/components/shared/centered-spinner';
import { ErrorState } from '@/components/shared/error-state';
import { PageBreadcrumb } from '@/components/shared/page-breadcrumb';
import { ReservationStatusBadge } from '@/components/shared/reservation-status-badge';
import { MercadoPagoBrick } from '@/components/student/mercadopago-brick';
import { formatearFecha, formatRango } from '@/lib/relative-time';
import { formatPEN } from '@/lib/money';
import { notify } from '@/lib/notify';
import { POLITICA_CANCELACION_INFO } from '@/lib/politica-cancelacion';
import { pagoService, type ValidarCuponResponse } from '@/services/pago-service';
import { reservationService } from '@/services/reservation-service';
import { servicioPropiedades } from '@/services/property-service';
import type { Reserva } from '@/types/reserva';
import type { Propiedad } from '@/types/propiedad';

const STEPS: StepperStep[] = [
  { key: 'solicitud', label: 'Solicitud' },
  { key: 'aprobacion', label: 'Aprobación' },
  { key: 'pago', label: 'Pago' },
  { key: 'confirmacion', label: 'Confirmación' },
];

function pasoActual(estado: Reserva['estado']): number {
  switch (estado) {
    case 'PAGADA':
    case 'FINALIZADA':
      return 3;
    case 'APROBADA':
      return 2;
    case 'RECHAZADA':
    case 'CANCELADA':
    case 'EXPIRADA':
      return 1;
    case 'SOLICITADA':
    default:
      return 0;
  }
}

const ESTADOS_NO_DISPONIBLES: Reserva['estado'][] = ['RECHAZADA', 'CANCELADA', 'EXPIRADA'];

export default function CheckoutReservaPage() {
  const params = useParams<{ reservaId: string }>();
  const reservaId = params?.reservaId;
  const router = useRouter();

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no-encontrado' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);

  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptadoEn, setAceptadoEn] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);
  // Ítem 276: "aqui" = Payment Brick embebido (default); "mercadopago" = Checkout Pro de
  // siempre, se mantiene como alternativa (no se quita ningún camino existente).
  const [metodoPago, setMetodoPago] = useState<'aqui' | 'mercadopago'>('aqui');

  // Ítem 292: cupones de descuento. Solo soportado en Checkout Pro por ahora — el Payment Brick
  // (cobro directo) no pasa por `crearPreferencia`, que es donde se aplica el descuento.
  const [cuponCodigo, setCuponCodigo] = useState('');
  const [cuponResultado, setCuponResultado] = useState<ValidarCuponResponse | null>(null);
  const [validandoCupon, setValidandoCupon] = useState(false);

  const reintentar = () => {
    setEstado('cargando');
    setIntento((n) => n + 1);
  };

  // Mismo patrón que `student/reservations/[id]/page.tsx`: todo el fetch encadenado con
  // .then()/.catch() dentro del propio efecto, sin invocar nada que setee estado de forma
  // síncrona en el cuerpo del efecto. La propiedad (política de cancelación + depósito) se
  // busca aparte porque `Reserva` no la trae — si esa segunda llamada falla, se ignora en
  // silencio: la página ya tiene lo esencial (reserva) para operar.
  useEffect(() => {
    if (!reservaId) return;
    let cancelado = false;
    reservationService
      .obtenerPorId(reservaId)
      .then((r) => {
        if (cancelado) return;
        if (!r) {
          setEstado('no-encontrado');
          return;
        }
        setReserva(r);
        setEstado('ok');
        return servicioPropiedades
          .obtenerPorId(r.propiedadId)
          .catch(() => null)
          .then((p) => {
            if (!cancelado) setPropiedad(p);
          });
      })
      .catch(() => {
        if (cancelado) return;
        setEstado('error');
      });
    return () => {
      cancelado = true;
    };
  }, [reservaId, intento]);

  const handleAceptaChange = (checked: boolean) => {
    setAceptaTerminos(checked);
    setAceptadoEn(checked ? new Date().toISOString() : null);
  };

  const handlePagar = async () => {
    if (!reserva || !aceptaTerminos) return;
    setPagando(true);
    try {
      const codigoAplicado = cuponResultado?.valido ? cuponCodigo.trim() : undefined;
      const { url } = await pagoService.crearPreferencia(reserva.id, codigoAplicado);
      if (!url) throw new Error('Sin URL de checkout');
      window.location.href = url;
    } catch (err) {
      notify.error(err, 'No pudimos iniciar el pago. Inténtalo de nuevo.');
      setPagando(false);
    }
  };

  const handleAplicarCupon = async () => {
    if (!reserva || !cuponCodigo.trim()) return;
    setValidandoCupon(true);
    try {
      const resultado = await pagoService.validarCupon(reserva.id, cuponCodigo.trim());
      setCuponResultado(resultado);
      if (resultado.valido) {
        // El Brick no soporta cupones (ver comentario en el estado): forzamos Checkout Pro.
        setMetodoPago('mercadopago');
      }
    } catch (err) {
      notify.error(err, 'No pudimos validar el cupón. Inténtalo de nuevo.');
    } finally {
      setValidandoCupon(false);
    }
  };

  const handleQuitarCupon = () => {
    setCuponCodigo('');
    setCuponResultado(null);
  };

  // Ítem 276: el Brick embebido reusa las mismas páginas de resultado (confeti, NPS, checklist,
  // polling, mapa de errores de MP) que ya arma el flujo de Checkout Pro — mismo `external_reference`
  // que usa PagoService al crear el link de pago, así esas páginas no necesitan saber de dónde vino el pago.
  const irAExito = () => {
    if (!reserva) return;
    router.push(`/pago/exito?external_reference=${reserva.id}`);
  };
  const irAPendiente = () => {
    if (!reserva) return;
    router.push(`/pago/pendiente?external_reference=${reserva.id}`);
  };
  const irAFallo = (statusDetail: string | null) => {
    if (!reserva) return;
    const qs = new URLSearchParams({ external_reference: reserva.id });
    if (statusDetail) qs.set('status_detail', statusDetail);
    router.push(`/pago/fallo?${qs.toString()}`);
  };

  if (estado === 'cargando') {
    return <CenteredSpinner className="py-24" />;
  }

  if (estado === 'no-encontrado') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <ErrorState
          title="Reserva no encontrada"
          description="Es posible que la reserva ya no exista o el enlace sea incorrecto."
          retryLabel="Volver a mis reservas"
          onRetry={() => {
            window.location.href = '/student/reservations';
          }}
        />
      </div>
    );
  }

  if (estado === 'error' || !reserva) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <ErrorState
          title="No pudimos cargar el checkout"
          description="Ocurrió un problema de conexión. Inténtalo de nuevo."
          retryLabel="Reintentar"
          onRetry={reintentar}
        />
      </div>
    );
  }

  const comision = reserva.comision ?? 0;
  const totalPago = reserva.montoTotal + comision;
  const cuponAplicado = cuponResultado?.valido ?? false;
  const totalConCupon = cuponAplicado ? cuponResultado!.totalConDescuento : totalPago;
  const politicaInfo = propiedad?.politicaCancelacion
    ? POLITICA_CANCELACION_INFO[propiedad.politicaCancelacion]
    : null;

  const puedePagar = reserva.estado === 'APROBADA';
  const yaPagada = reserva.estado === 'PAGADA' || reserva.estado === 'FINALIZADA';
  const noDisponible = ESTADOS_NO_DISPONIBLES.includes(reserva.estado);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <PageBreadcrumb
        className="mb-4"
        items={[
          { label: 'Mi panel', href: '/student' },
          { label: 'Mis reservas', href: '/student/reservations' },
          { label: 'Checkout' },
        ]}
      />

      <h1 className="text-h1 mb-6">Finalizar reserva</h1>

      <Stepper steps={STEPS} currentIndex={pasoActual(reserva.estado)} className="mb-8" />

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row">
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-40">
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
        </div>
        <div className="min-w-0 flex-1">
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
            <ReservationStatusBadge estado={reserva.estado} />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
            {formatRango(reserva.fechaInicio, reserva.fechaFin)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Desglose de precio
        </h2>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Renta</span>
            <span className="tnum font-semibold text-foreground">{formatPEN(reserva.montoTotal)}</span>
          </div>
          {comision > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Comisión de servicio</span>
              <span
                className={`tnum font-semibold ${cuponAplicado ? 'text-muted-foreground line-through' : 'text-foreground'}`}
              >
                {formatPEN(comision, { decimales: true })}
              </span>
            </div>
          )}
          {cuponAplicado && (
            <div className="flex items-center justify-between text-success">
              <span className="font-semibold">Descuento ({cuponCodigo.trim().toUpperCase()})</span>
              <span className="tnum font-semibold">
                −{formatPEN(cuponResultado!.montoDescuento, { decimales: true })}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="font-bold text-foreground">Total a pagar ahora</span>
            <span className="tnum text-xl font-black text-primary">
              {formatPEN(totalConCupon, { decimales: true })}
            </span>
          </div>
        </div>
        {propiedad?.deposito != null && (
          <p className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            + Depósito de garantía:{' '}
            <strong className="font-bold text-foreground">{formatPEN(propiedad.deposito)}</strong>{' '}
            (pago único aparte, no se cobra en este paso).
          </p>
        )}

        {puedePagar && (
          <div className="mt-4 border-t border-border pt-4">
            {cuponAplicado ? (
              <div className="flex items-center justify-between rounded-xl bg-success-light px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-success">
                  <Ticket className="size-4" aria-hidden />
                  Cupón {cuponCodigo.trim().toUpperCase()} aplicado
                </span>
                <button
                  type="button"
                  onClick={handleQuitarCupon}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Quitar cupón"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    value={cuponCodigo}
                    onChange={(e) => setCuponCodigo(e.target.value)}
                    placeholder="¿Tienes un cupón de descuento?"
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAplicarCupon();
                      }
                    }}
                  />
                  {cuponResultado && !cuponResultado.valido && (
                    <p className="mt-1 text-xs font-semibold text-destructive">{cuponResultado.mensaje}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 font-bold"
                  loading={validandoCupon}
                  disabled={!cuponCodigo.trim()}
                  onClick={handleAplicarCupon}
                >
                  Aplicar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {politicaInfo && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card p-5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="text-sm">
            <p className="font-bold text-foreground">
              Política de cancelación {politicaInfo.label.toLowerCase()}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{politicaInfo.descripcion}</p>
          </div>
        </div>
      )}

      {yaPagada && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-success/20 bg-success-light p-6 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
          <p className="font-bold text-foreground">Esta reserva ya está pagada.</p>
          <Button asChild size="lg" className="rounded-full font-bold">
            <Link href={`/student/reservations/${reserva.id}`}>Ver mi reserva</Link>
          </Button>
        </div>
      )}

      {reserva.estado === 'SOLICITADA' && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-border bg-muted/40 p-6 text-center">
          <Clock className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-bold text-foreground">Tu solicitud aún no fue aprobada.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Podrás pagar en cuanto el arrendador apruebe tu reserva.
          </p>
          {/* Ítem 414: botón "Pagar" deshabilitado explícito (en vez de solo omitirlo) para que
              quede claro dónde aparecerá la acción y por qué no está disponible todavía. Un
              botón `disabled` no dispara eventos de puntero/foco, así que el Tooltip envuelve un
              <span> alrededor (patrón estándar de Radix para tooltips en botones disabled). */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="w-full max-w-xs">
                  <Button disabled className="w-full rounded-full font-bold">
                    Pagar
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-56 text-xs">
                Disponible cuando el arrendador apruebe tu solicitud.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button asChild variant="outline" className="rounded-full font-bold">
            <Link href="/student/reservations">Ver mis reservas</Link>
          </Button>
        </div>
      )}

      {noDisponible && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-border bg-muted/40 p-6 text-center">
          <p className="font-bold text-foreground">Esta reserva ya no está disponible para pago.</p>
          <Button asChild variant="outline" className="rounded-full font-bold">
            <Link href="/student/reservations">Ver mis reservas</Link>
          </Button>
        </div>
      )}

      {puedePagar && (
        <>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
            <Checkbox
              id="checkout-terminos"
              checked={aceptaTerminos}
              onCheckedChange={(checked) => handleAceptaChange(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="checkout-terminos" className="cursor-pointer text-sm text-muted-foreground">
              <strong className="text-foreground">
                Acepto la política de cancelación y la comisión de servicio.
              </strong>{' '}
              {politicaInfo
                ? `Cancelación ${politicaInfo.label.toLowerCase()}: ${politicaInfo.resumen}`
                : 'Aplica la política de cancelación vigente de esta propiedad.'}{' '}
              {comision > 0
                ? `Se cobra una comisión de servicio de ${formatPEN(comision, { decimales: true })} sobre la renta.`
                : 'Esta reserva no tiene comisión de servicio adicional.'}
              {aceptadoEn && (
                <span className="mt-1 block text-[11px] text-muted-foreground/70">
                  Aceptado el {formatearFecha(aceptadoEn, true)}
                </span>
              )}
            </label>
          </div>

          {aceptaTerminos && (
            <>
              {/* Ítem 276: Payment Brick embebido por defecto; Checkout Pro como alternativa.
                  Ítem 292: con un cupón aplicado, "Pagar aquí" se deshabilita — el Brick no pasa
                  por crearPreferencia, que es donde se aplica el descuento. */}
              <div className="mt-4 flex gap-2 rounded-full bg-muted p-1 text-xs font-bold">
                <button
                  type="button"
                  disabled={cuponAplicado}
                  onClick={() => setMetodoPago('aqui')}
                  title={cuponAplicado ? 'Los cupones solo se aplican pagando con Mercado Pago' : undefined}
                  className={`flex-1 rounded-full py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    metodoPago === 'aqui' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Pagar aquí
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPago('mercadopago')}
                  className={`flex-1 rounded-full py-2 transition-colors ${
                    metodoPago === 'mercadopago' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Ir a Mercado Pago
                </button>
              </div>
              {cuponAplicado && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Tu cupón solo aplica pagando con Mercado Pago.
                </p>
              )}

              {metodoPago === 'aqui' ? (
                <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                  <MercadoPagoBrick
                    reservaId={reserva.id}
                    monto={totalPago}
                    onExito={irAExito}
                    onPendiente={irAPendiente}
                    onFallo={irAFallo}
                  />
                </div>
              ) : (
                <Button
                  size="lg"
                  className="mt-4 h-12 w-full rounded-full text-sm font-bold"
                  loading={pagando}
                  onClick={handlePagar}
                >
                  {pagando
                    ? 'Redirigiendo a Mercado Pago…'
                    : `Pagar ${formatPEN(totalConCupon, { decimales: true })}`}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
