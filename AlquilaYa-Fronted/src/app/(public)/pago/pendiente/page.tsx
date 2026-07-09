'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { PaymentResult } from '@/components/shared/payment-result';

export default function PagoPendientePage() {
  return (
    <PaymentResult
      variant="pendiente"
      title="Pago en proceso"
      description={
        <>
          Tu pago está siendo procesado (por ejemplo, pago en efectivo en agente).
          Cuando se confirme, tu reserva pasará automáticamente a estado{' '}
          <strong>PAGADA</strong>. No necesitas hacer nada más.
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
