'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PaymentResult } from '@/components/shared/payment-result';
import { FadeIn } from '@/components/motion';
import { pagoService } from '@/services/pago-service';

const POLL_MS = 5000;
const MAX_INTENTOS = 24; // 24 x 5s = 2 minutos

function PagoPendienteContent() {
  const params = useSearchParams();
  const router = useRouter();
  const externalReference = params.get('external_reference');
  const reservaId = externalReference ? externalReference.split(':')[0] : null;

  const [confirmado, setConfirmado] = useState(false);
  const [agotado, setAgotado] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Ítem 272: polling cada 5s, máx 24 intentos (2 min). El AbortController corta el ciclo al
  // desmontar; pagoService.getEstadoPago no acepta un `signal` (no se toca esa función, la
  // comparten otros ítems/agentes), así que lo que cancela es el *efecto* de la respuesta
  // (dejar de programar el siguiente intento y de actualizar estado), no el request HTTP en sí.
  useEffect(() => {
    if (!reservaId || confirmado) return;

    const controlador = new AbortController();
    let intentos = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      intentos += 1;
      try {
        const r = await pagoService.getEstadoPago(reservaId);
        if (controlador.signal.aborted) return;
        if (r.estado === 'PAGADO') {
          setPaymentId(r.paymentId);
          setConfirmado(true);
          return;
        }
      } catch {
        // Error transitorio de red: seguimos reintentando hasta agotar los intentos.
      }
      if (controlador.signal.aborted) return;
      if (intentos >= MAX_INTENTOS) {
        setAgotado(true);
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };

    void poll();

    return () => {
      controlador.abort();
      if (timer) clearTimeout(timer);
    };
  }, [reservaId, confirmado]);

  // Transición a la vista de éxito sin recargar: mostramos un momento el estado confirmado y
  // luego navegamos a /pago/exito (que trae el checklist post-pago y la encuesta NPS).
  useEffect(() => {
    if (!confirmado) return;
    const timer = setTimeout(() => {
      const query = new URLSearchParams();
      if (paymentId) query.set('payment_id', paymentId);
      if (reservaId) query.set('external_reference', reservaId);
      const qs = query.toString();
      router.replace(`/pago/exito${qs ? `?${qs}` : ''}`);
    }, 1400);
    return () => clearTimeout(timer);
  }, [confirmado, paymentId, reservaId, router]);

  if (confirmado) {
    return (
      <FadeIn>
        <PaymentResult
          variant="exito"
          title="¡Pago confirmado!"
          description="Tu reserva pasó a estado PAGADA. Te llevamos a los detalles…"
          actions={null}
        />
      </FadeIn>
    );
  }

  if (!reservaId) {
    return (
      <PaymentResult
        variant="pendiente"
        title="Pago en proceso"
        description={
          <>
            Tu pago está siendo procesado (por ejemplo, pago en efectivo en agente). Cuando se
            confirme, tu reserva pasará automáticamente a estado <strong>PAGADA</strong>. No
            necesitas hacer nada más.
          </>
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/student/reservations">Ver mis reservas</Link>
          </Button>
        }
      />
    );
  }

  return (
    <PaymentResult
      variant="pendiente"
      title={agotado ? 'Aún no confirmamos tu pago' : 'Confirmando tu pago…'}
      description={
        agotado ? (
          <>
            Si ya pagaste, puede tardar unos minutos más en reflejarse. Revisa tus reservas o
            vuelve a esta página más tarde.
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-5 animate-spin text-warning" aria-hidden />
            <p>
              Tu pago está siendo procesado (por ejemplo, pago en efectivo en agente). Cuando se
              confirme, tu reserva pasará automáticamente a estado <strong>PAGADA</strong>.
            </p>
          </div>
        )
      }
      actions={
        <Button variant="outline" asChild>
          <Link href="/student/reservations">Ver mis reservas</Link>
        </Button>
      }
    />
  );
}

export default function PagoPendientePage() {
  return (
    <Suspense>
      <PagoPendienteContent />
    </Suspense>
  );
}
