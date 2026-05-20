'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

function PagoExitoContent() {
  const params = useSearchParams();
  const paymentId = params.get('payment_id');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <CheckCircle2 className="size-20 text-green-500" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">¡Pago realizado con éxito!</h1>
        <p className="text-muted-foreground">
          Tu pago fue procesado correctamente. Tu reserva pasará a estado{' '}
          <strong>PAGADA</strong> en unos segundos.
        </p>
        {paymentId && (
          <p className="text-xs text-muted-foreground">
            Referencia: {paymentId}
          </p>
        )}
      </div>
      <Button asChild>
        <Link href="/student/reservations">Ver mis reservas</Link>
      </Button>
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
