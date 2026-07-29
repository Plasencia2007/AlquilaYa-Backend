'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { PaymentResult } from '@/components/shared/payment-result';
import { PostPaymentChecklist } from '@/components/shared/post-payment-checklist';
import { NpsWidget } from '@/components/shared/nps-widget';
import { notify } from '@/lib/notify';
import { pagoService } from '@/services/pago-service';

function useConfettiOnMount() {
  const disparado = useRef(false);
  const prefiereReducido = useReducedMotion();

  useEffect(() => {
    if (disparado.current || prefiereReducido) return;
    disparado.current = true;
    confetti({
      particleCount: 100,
      spread: 75,
      startVelocity: 35,
      origin: { y: 0.65 },
      scalar: 0.85,
      ticks: 180,
    });
  }, [prefiereReducido]);
}

function PagoExitoContent() {
  const params = useSearchParams();
  const paymentId = params.get('payment_id');
  // MP redirige con external_reference = "reservaId" (individual) o "reservaId:estudianteId"
  // (pago dividido, #38 Fase 2) — mismo formato que setea PagoService al crear la preferencia.
  const externalReference = params.get('external_reference');
  const reservaId = externalReference ? externalReference.split(':')[0] : null;
  const [descargando, setDescargando] = useState(false);

  useConfettiOnMount();

  const descargarComprobante = async () => {
    if (!reservaId) return;
    setDescargando(true);
    try {
      const blob = await pagoService.descargarComprobante(reservaId);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) notify.warning('Habilita las ventanas emergentes para ver el comprobante.');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      notify.error(err, 'El comprobante aún no está listo. Intenta de nuevo en unos segundos.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-10 pb-16">
      <PaymentResult
        variant="exito"
        title="¡Pago realizado con éxito!"
        description={
          <>
            <p>
              Tu pago fue procesado correctamente. Tu reserva pasará a estado{' '}
              <strong>PAGADA</strong> en unos segundos.
            </p>
            {paymentId && <p className="text-xs">Referencia: {paymentId}</p>}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/student/reservations">Ver mis reservas</Link>
            </Button>
            {reservaId && (
              <Button variant="outline" onClick={descargarComprobante} disabled={descargando} className="gap-2">
                {descargando ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Descargar comprobante
              </Button>
            )}
          </div>
        }
      />

      {reservaId && (
        <div className="w-full max-w-md space-y-6 px-4">
          <PostPaymentChecklist reservaId={reservaId} />
          <NpsWidget reservaId={reservaId} />
        </div>
      )}
    </div>
  );
}

export default function PagoExitoPage() {
  return (
    <Suspense>
      <PagoExitoContent />
    </Suspense>
  );
}
