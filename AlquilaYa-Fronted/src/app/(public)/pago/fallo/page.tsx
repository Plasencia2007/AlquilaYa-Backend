'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

function PagoFalloContent() {
  const params = useSearchParams();
  const reservaId = params.get('external_reference');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <XCircle className="size-20 text-destructive" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">El pago no se completó</h1>
        <p className="text-muted-foreground">
          Hubo un problema al procesar tu pago. Tu reserva sigue activa y puedes
          intentarlo de nuevo cuando quieras.
        </p>
      </div>
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
    </div>
  );
}

export default function PagoFalloPage() {
  return (
    <Suspense>
      <PagoFalloContent />
    </Suspense>
  );
}
