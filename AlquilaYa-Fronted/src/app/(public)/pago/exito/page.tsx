'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { PaymentResult } from '@/components/shared/payment-result';

function PagoExitoContent() {
  const params = useSearchParams();
  const paymentId = params.get('payment_id');

  return (
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
        <Button asChild>
          <Link href="/student/reservations">Ver mis reservas</Link>
        </Button>
      }
    />
  );
}

export default function PagoExitoPage() {
  return (
    <Suspense>
      <PagoExitoContent />
    </Suspense>
  );
}
