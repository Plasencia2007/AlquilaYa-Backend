'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { PaymentResult } from '@/components/shared/payment-result';
import { traducirErrorMercadoPago } from '@/lib/mercadopago-errores';

function PagoFalloContent() {
  const params = useSearchParams();
  const reservaId = params.get('external_reference');
  const statusDetail = params.get('status_detail');
  const mensajeError = traducirErrorMercadoPago(statusDetail);

  return (
    <PaymentResult
      variant="fallo"
      title="El pago no se completó"
      description={
        <>
          <p>{mensajeError}</p>
          <p>Tu reserva sigue activa y puedes intentarlo de nuevo cuando quieras.</p>
        </>
      }
      actions={
        <div className="flex gap-3">
          {reservaId && (
            <Button variant="default" asChild>
              <Link href="/student/reservations">Reintentar pago</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/student/reservations">Ver mis reservas</Link>
          </Button>
        </div>
      }
    />
  );
}

export default function PagoFalloPage() {
  return (
    <Suspense>
      <PagoFalloContent />
    </Suspense>
  );
}
