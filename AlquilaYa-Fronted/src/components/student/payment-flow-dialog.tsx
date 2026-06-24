'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Clock, Copy, ExternalLink, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { pagoService } from '@/services/pago-service';

type Fase = 'waiting' | 'paid' | 'rejected' | 'timeout';

interface Props {
  open: boolean;
  reservaId: string | number;
  monto: number;
  propiedadTitulo?: string;
  /** Para reabrir la pestaña de Mercado Pago si el usuario la cerró. */
  checkoutUrl?: string | null;
  onClose: () => void;
  /** Se llama cuando el pago se confirma (para refrescar la lista). */
  onPaid?: () => void;
}

const POLL_MS = 3000;
const MAX_MS = 6 * 60 * 1000; // deja de esperar tras 6 min

export function PaymentFlowDialog({
  open,
  reservaId,
  monto,
  propiedadTitulo,
  checkoutUrl,
  onClose,
  onPaid,
}: Props) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>('waiting');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  // Monto REAL cobrado (incluye comisión). El prop `monto` es solo la parte del
  // arrendador; el cobrado real lo trae el backend en el estado del pago.
  const [montoPagado, setMontoPagado] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [nonce, setNonce] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setFase('waiting');
    setPaymentId(null);
    setMontoPagado(null);
    setCopiado(false);
    startRef.current = Date.now();
    let activo = true;

    const check = async () => {
      if (!activo) return;
      try {
        const r = await pagoService.getEstadoPago(reservaId);
        if (!activo) return;
        if (r.estado === 'PAGADO') {
          setPaymentId(r.paymentId);
          if (r.monto != null) setMontoPagado(r.monto);
          setFase('paid');
          stop();
          onPaid?.();
          router.refresh();
          return;
        }
        if (r.estado === 'RECHAZADO') {
          setFase('rejected');
          stop();
          router.refresh();
          return;
        }
      } catch {
        // Error transitorio de red: seguimos reintentando hasta el timeout.
      }
      if (Date.now() - startRef.current > MAX_MS) {
        setFase((f) => (f === 'waiting' ? 'timeout' : f));
        stop();
      }
    };

    void check();
    timerRef.current = setInterval(check, POLL_MS);

    // Cuando el usuario vuelve a esta pestaña tras pagar, chequeamos al instante.
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      activo = false;
      stop();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [open, reservaId, nonce, stop, onPaid, router]);

  if (!open) return null;

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

  const reabrir = () => {
    if (checkoutUrl) window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  };

  const seguirEsperando = () => {
    setFase('waiting');
    setNonce((n) => n + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      {/* keyframes locales para la animación del check */}
      <style>{`
        @keyframes ayp-draw { to { stroke-dashoffset: 0; } }
        @keyframes ayp-pop { 0% { transform: scale(.8); opacity: 0; } 60% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
        .ayp-pop { animation: ayp-pop .45s ease-out both; }
        .ayp-circle { stroke-dasharray: 166; stroke-dashoffset: 166; animation: ayp-draw .6s ease-out forwards; }
        .ayp-mark { stroke-dasharray: 48; stroke-dashoffset: 48; animation: ayp-draw .35s .45s ease-out forwards; }
      `}</style>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>

        {/* ----------------------------- ESPERANDO ----------------------------- */}
        {fase === 'waiting' && (
          <div className="flex flex-col items-center gap-5">
            <div className="relative mx-auto flex size-24 items-center justify-center">
              <span className="absolute inline-flex size-20 animate-ping rounded-full bg-primary/20" />
              <span className="absolute inline-flex size-16 rounded-full bg-primary/10" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/15">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-foreground">Esperando tu pago…</h2>
              <p className="text-sm text-muted-foreground">
                Completa el pago en la pestaña de <strong>Mercado Pago</strong>. Esta ventana se
                actualizará <strong>sola</strong> cuando confirmemos tu pago. 🔒
              </p>
              {propiedadTitulo && (
                <p className="truncate pt-1 text-xs text-muted-foreground">{propiedadTitulo}</p>
              )}
            </div>
            <div className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary" />
            </div>
            <div className="flex w-full flex-col gap-2 pt-2">
              {checkoutUrl && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={reabrir}>
                  <ExternalLink className="size-4" /> Reabrir Mercado Pago
                </Button>
              )}
              <button
                onClick={onClose}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Pagar más tarde
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------- ÉXITO ------------------------------- */}
        {fase === 'paid' && (
          <div className="ayp-pop flex flex-col items-center gap-5">
            <div className="relative mx-auto flex size-24 items-center justify-center">
              <span className="absolute inline-flex size-24 animate-ping rounded-full bg-green-500/20" />
              <svg viewBox="0 0 52 52" className="relative size-24 text-green-500">
                <circle
                  className="ayp-circle"
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="ayp-mark"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 27l7 7 15-16"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-foreground">¡Pago realizado! 🎉</h2>
              <p className="text-sm text-muted-foreground">
                Tu reserva quedó <strong>confirmada</strong>.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-border bg-muted/40 p-4 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Monto pagado
              </p>
              <p className="text-lg font-black text-foreground">
                S/ {(montoPagado ?? monto).toLocaleString('es-PE')}
              </p>
              {paymentId && (
                <>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Código de pago
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="truncate font-mono text-sm text-foreground">{paymentId}</code>
                    <button
                      onClick={copiar}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition',
                        copiado
                          ? 'bg-green-500/15 text-green-600'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex w-full flex-col gap-2">
              <Button asChild className="font-bold">
                <Link href="/student/reservations">Ver mis reservas</Link>
              </Button>
              <button
                onClick={onClose}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------- RECHAZADO ----------------------------- */}
        {fase === 'rejected' && (
          <div className="ayp-pop flex flex-col items-center gap-5">
            <div className="flex size-20 items-center justify-center rounded-full bg-destructive/15">
              <X className="size-10 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">El pago fue rechazado</h2>
              <p className="text-sm text-muted-foreground">
                No se pudo procesar el pago. Puedes intentarlo de nuevo con otro medio.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              {checkoutUrl && (
                <Button className="font-bold" onClick={reabrir}>
                  Intentar de nuevo
                </Button>
              )}
              <button
                onClick={onClose}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------ TIMEOUT ------------------------------ */}
        {fase === 'timeout' && (
          <div className="flex flex-col items-center gap-5">
            <div className="flex size-20 items-center justify-center rounded-full bg-amber-500/15">
              <Clock className="size-10 text-amber-500" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">Aún no confirmamos tu pago</h2>
              <p className="text-sm text-muted-foreground">
                Si ya pagaste, puede tardar unos minutos. Revisa tus reservas o sigue esperando.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <Button variant="outline" className="font-bold" onClick={seguirEsperando}>
                Seguir esperando
              </Button>
              <Button asChild className="font-bold">
                <Link href="/student/reservations">Ver mis reservas</Link>
              </Button>
              <button
                onClick={onClose}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
